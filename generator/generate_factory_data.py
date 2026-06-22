"""
Synthetic Manufacturing Telemetry Generator  (3-year, full-fidelity)
====================================================================

Generates a domain-realistic synthetic dataset for a multi-station robotic
assembly line over a 3-year window. NO proprietary data is used. Every defect
is emitted as an individual record (no downsampling).

What makes this *factory-realistic* rather than a repeated sine wave -- the
failure and success rates drift year over year the way a real plant's would:

  FAILURE-side variation
   - Weibull time-to-failure (wear-out), with the fleet aging across 3 years
   - Year-specific summer/winter SEVERITY (no two summers alike)
   - Acute events: heat wave, cold snap (transient fault clusters)
   - Asset REPLACEMENTS: worst robots get swapped; their fault clock resets
   - A reliability/PM program that lowers mechanical faults from a start date

  SUCCESS-side variation
   - A continuous-improvement learning curve (yield trends up over time)
   - A new product variant mid-window: temporary yield dip + throughput ramp
   - A supplier bad-batch window (defect spike at one station)
   - Permanent PROCESS CHANGES (a station's defect rate steps down for good)
   - Demand growth (planned throughput rises ~6%/yr)

  Plus the structural signals from the original model:
   - Shift/crew variance ("invisible night shift": night MTTR penalty + handoff)
   - Defect PROPAGATION (root-cause station vs detected station)
   - Messy free-text shift logs

Outputs (CSV) into ./output:
  dim_asset.csv               assets (with generation # after replacements)
  dim_shift_calendar.csv      crew rotation calendar
  dim_events.csv              ground-truth log of known events (for analysis)
  fact_fault_events.csv       every equipment fault (downtime)
  fact_production.csv         hourly throughput + scrap per line
  fact_defect_events.csv      EVERY defect, with root-cause attribution
  fact_maintenance_events.csv preventive maintenance + replacements
  shift_logs.csv              messy free-text technician notes

Author: Scott Campbell Consulting LLC  (portfolio synthetic data)
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, date
import math, os

# --------------------------------------------------------------------------
# CONFIG
# --------------------------------------------------------------------------
SEED = 1970
rng = np.random.default_rng(SEED)

START = datetime(2025, 7, 1, 6, 0, 0)     # 3-year window
DAYS = 1095
END = START + timedelta(days=DAYS)

N_ROBOTS = 37
N_CONVEYOR_SEGMENTS = 120

OUT = "output"
os.makedirs(OUT, exist_ok=True)

STATIONS = [
    ("ST01", "Substrate Load"),
    ("ST02", "Deposition"),
    ("ST03", "Laser Scribe"),
    ("ST04", "Lamination"),
    ("ST05", "Edge Seal / Frame"),
    ("ST06", "Junction Box"),
    ("ST07", "Flash Test / QC"),
    ("ST08", "Packaging"),
]
STATION_IDS = [s[0] for s in STATIONS]
STATION_NAME = dict(STATIONS)
STATION_ORDER = {sid: i for i, (sid, _) in enumerate(STATIONS)}

LINES = ["L1", "L2", "L3"]
CREWS = ["A", "B", "C", "D"]
CREW_SKILL = {
    "A": dict(fault=0.95, mttr=0.95),
    "B": dict(fault=1.00, mttr=1.00),
    "C": dict(fault=1.05, mttr=1.05),
    "D": dict(fault=1.10, mttr=1.25),   # night crew handicap
}

WEIBULL = {
    "robot":    dict(beta=1.8, eta=900),
    "conveyor": dict(beta=1.4, eta=2200),
}

FAULT_CATALOG = {
    "robot": [
        ("R-SERVO", "Servo overcurrent",        0.22, 45),
        ("R-ENC",   "Encoder fault",            0.15, 60),
        ("R-COLL",  "Collision detect stop",    0.10, 30),
        ("R-PNEU",  "Pneumatic pressure low",   0.18, 25),
        ("R-VIS",   "Vision calibration drift", 0.12, 50),
        ("R-ESTOP", "E-stop triggered",         0.08, 20),
        ("R-TEMP",  "Drive overtemp",           0.15, 40),
    ],
    "conveyor": [
        ("C-JAM",   "Product jam",              0.34, 15),
        ("C-BELT",  "Belt tracking error",      0.16, 35),
        ("C-MOTOR", "Gearmotor fault",          0.12, 70),
        ("C-PHOTO", "Photo-eye misread",        0.20, 12),
        ("C-VFD",   "VFD trip",                 0.10, 30),
        ("C-BEAR",  "Bearing vibration alarm",  0.08, 55),
    ],
}
THERMAL_CODES = {"R-TEMP", "R-SERVO", "C-MOTOR", "C-VFD"}
MECHANICAL_CODES = {"R-ENC", "R-PNEU", "C-BELT", "C-BEAR", "R-COLL"}  # PM-reducible

# --------------------------------------------------------------------------
# YEAR-OVER-YEAR DYNAMICS  (the heart of "no two years alike")
# --------------------------------------------------------------------------
# Severity multiplier applied to the seasonal swing. >1 = harsher season.
SUMMER_SEVERITY = {2025: 1.25, 2026: 0.75, 2027: 1.55, 2028: 1.05}
# Winter keyed by the year its January falls in.
WINTER_SEVERITY = {2026: 0.85, 2027: 1.45, 2028: 0.70}

# Acute transient events: (start, end, scope, fault_mult, defect_mult, label)
#   scope: which fault codes the fault_mult applies to ("thermal","mechanical","all")
ACUTE_EVENTS = [
    (date(2027, 7, 10), date(2027, 7, 24), "thermal", 2.0, 1.0,
     "Heat wave - elevated drive/motor thermal faults"),
    (date(2027, 1, 8),  date(2027, 1, 18), "mechanical", 1.6, 1.0,
     "Cold snap - pneumatic/mechanical faults up"),
    (date(2026, 10, 5), date(2026, 10, 26), "all", 1.0, 2.4,
     "Supplier bad batch - junction box seal defects (ST06)"),
]
ACUTE_DEFECT_STATION = {  # which station a defect-spiking acute event hits
    "Supplier bad batch - junction box seal defects (ST06)": "ST06",
}

# Permanent process changes: (date, station, defect_mult_after, label)
PROCESS_CHANGES = [
    (date(2026, 4, 15), "ST03", 0.55, "Laser optics upgrade - scribe defects down"),
    (date(2027, 9, 1),  "ST02", 0.70, "Deposition chamber retune - coating defects down"),
]

# New product variant introduction (learning-curve restart on two stations)
NEW_PRODUCT_DATE = date(2027, 1, 20)
NEW_PRODUCT_STATIONS = {"ST04", "ST05"}
NEW_PRODUCT_DECAY_DAYS = 110          # defect bump decays over this many days
NEW_PRODUCT_PEAK_MULT = 1.70          # initial defect multiplier on affected stns
NEW_PRODUCT_RAMP_DAYS = 90            # throughput ramps back to full over this

# Reliability / PM program: from this date, mechanical faults reduced
RELIABILITY_PROGRAM_DATE = date(2026, 9, 1)
RELIABILITY_PROGRAM_MULT = 0.85

# Continuous improvement on defects (learning): linear start->end multiplier
CI_START_MULT = 1.15
CI_END_MULT = 0.80

# Demand growth on planned throughput
NOMINAL_BASE = 460
DEMAND_GROWTH_PER_YEAR = 0.06

# Asset replacement policy
MAX_REPLACEMENTS = 6
REPLACE_MIN_DATE = START + timedelta(days=210)

# --------------------------------------------------------------------------
# Seasonal / event helper functions
# --------------------------------------------------------------------------
def summer_signal(ts):
    doy = ts.timetuple().tm_yday
    return math.cos(2 * math.pi * (doy - 200) / 365.0)   # +1 mid-Jul, -1 mid-Jan

def season_severity(ts):
    if summer_signal(ts) >= 0:
        return SUMMER_SEVERITY.get(ts.year, 1.0)
    wkey = ts.year + 1 if ts.month == 12 else ts.year
    return WINTER_SEVERITY.get(wkey, 1.0)

def seasonal_fault_factor(ts):
    """<1 => shorter interval => more faults. Severity scales the swing."""
    d = summer_signal(ts)
    amp = season_severity(ts)
    return 1.0 - 0.12 * d * amp

def acute_fault_mult(ts, code):
    d = ts.date()
    m = 1.0
    for start, end, scope, fmult, dmult, label in ACUTE_EVENTS:
        if start <= d <= end and fmult != 1.0:
            if scope == "all" or (scope == "thermal" and code in THERMAL_CODES) \
               or (scope == "mechanical" and code in MECHANICAL_CODES):
                m *= fmult
    return m

def reliability_program_mult(ts, code):
    if ts.date() >= RELIABILITY_PROGRAM_DATE and code in MECHANICAL_CODES:
        return RELIABILITY_PROGRAM_MULT
    return 1.0

def acute_defect_mult(ts, station):
    d = ts.date()
    m = 1.0
    for start, end, scope, fmult, dmult, label in ACUTE_EVENTS:
        if start <= d <= end and dmult != 1.0:
            if ACUTE_DEFECT_STATION.get(label) == station:
                m *= dmult
    return m

def process_defect_mult(ts, station):
    d = ts.date()
    m = 1.0
    for cdate, cstation, cmult, label in PROCESS_CHANGES:
        if d >= cdate and cstation == station:
            m *= cmult
    return m

def new_product_defect_mult(ts, station):
    d = ts.date()
    if d >= NEW_PRODUCT_DATE and station in NEW_PRODUCT_STATIONS:
        elapsed = (d - NEW_PRODUCT_DATE).days
        if elapsed <= NEW_PRODUCT_DECAY_DAYS:
            frac = 1.0 - elapsed / NEW_PRODUCT_DECAY_DAYS
            return 1.0 + (NEW_PRODUCT_PEAK_MULT - 1.0) * frac
    return 1.0

def ci_factor(ts):
    frac = (ts - START).days / DAYS
    return CI_START_MULT + (CI_END_MULT - CI_START_MULT) * frac

def demand_factor(ts):
    yrs = (ts - START).days / 365.0
    f = (1.0 + DEMAND_GROWTH_PER_YEAR) ** yrs
    # new-product throughput ramp (lower at intro, recovers)
    d = ts.date()
    if d >= NEW_PRODUCT_DATE:
        elapsed = (d - NEW_PRODUCT_DATE).days
        if elapsed <= NEW_PRODUCT_RAMP_DAYS:
            f *= 0.80 + 0.20 * (elapsed / NEW_PRODUCT_RAMP_DAYS)
    # December holiday cut
    if (d.month == 12 and d.day >= 22) or (d.month == 1 and d.day <= 2):
        f *= 0.55
    # mild summer heat derate, year-severity aware
    s = summer_signal(ts)
    if s > 0:
        f *= 1.0 - 0.03 * s * season_severity(ts)
    return f

# --------------------------------------------------------------------------
# 1. ASSETS
# --------------------------------------------------------------------------
def build_assets():
    rows = []
    for i in range(1, N_ROBOTS + 1):
        line = LINES[(i - 1) % len(LINES)]
        station = rng.choice(STATION_IDS[1:7])
        rows.append(dict(
            asset_id=f"ROB-{i:03d}", asset_class="robot", line=line,
            station=station,
            model=rng.choice(["FANUC-M20", "ABB-IRB1600", "KUKA-KR10"]),
            install_age_hrs=int(rng.integers(200, 6000)), generation=1))
    for j in range(1, N_CONVEYOR_SEGMENTS + 1):
        line = LINES[(j - 1) % len(LINES)]
        station = STATION_IDS[(j - 1) % len(STATION_IDS)]
        rows.append(dict(
            asset_id=f"CNV-{j:03d}", asset_class="conveyor", line=line,
            station=station,
            model=rng.choice(["Dorner-3200", "Hytrol-ABEZ", "FlexLink-X85"]),
            install_age_hrs=int(rng.integers(500, 12000)), generation=1))
    return pd.DataFrame(rows)

# --------------------------------------------------------------------------
# 2. SHIFT CALENDAR
# --------------------------------------------------------------------------
def build_shift_calendar():
    rows = []
    day = START.replace(hour=0, minute=0, second=0)
    while day < END:
        block = ((day - START.replace(hour=0)).days // 14) % 2
        if block == 0:
            day_crews, night_crews = ["A", "B"], ["C", "D"]
        else:
            day_crews, night_crews = ["C", "D"], ["A", "B"]
        parity = day.day % 2
        rows.append(dict(shift_id=f"{day:%Y%m%d}-D", shift_date=day.date(),
                         shift_type="day", start=day.replace(hour=6),
                         end=day.replace(hour=18), crew=day_crews[parity % 2]))
        rows.append(dict(shift_id=f"{day:%Y%m%d}-N", shift_date=day.date(),
                         shift_type="night", start=day.replace(hour=18),
                         end=(day + timedelta(days=1)).replace(hour=6),
                         crew=night_crews[parity % 2]))
        day += timedelta(days=1)
    return pd.DataFrame(rows)

# --------------------------------------------------------------------------
# 3. FAULTS  (with aging, seasonality, acute events, replacements, PM program)
# --------------------------------------------------------------------------
def build_faults(assets, cal):
    # fast shift lookup: sort calendar, use searchsorted on start
    cal_sorted = cal.sort_values("start").reset_index(drop=True)
    starts = cal_sorted["start"].values.astype("datetime64[ns]")
    def lookup(ts):
        idx = np.searchsorted(starts, np.datetime64(ts), side="right") - 1
        if idx < 0:
            return None, None, None
        r = cal_sorted.iloc[idx]
        if r["end"] > ts:
            return r["shift_id"], r["crew"], r["shift_type"]
        return None, None, None

    fault_rows = []
    maint_rows = []
    fault_seq = 0
    maint_seq = 0
    replacements_done = 0

    # mutable copy of asset ages/generations so replacements can reset them
    asset_state = assets.set_index("asset_id")[
        ["asset_class", "line", "station", "install_age_hrs", "generation"]
    ].to_dict("index")

    for asset_id, st in asset_state.items():
        cls = st["asset_class"]
        w = WEIBULL[cls]
        catalog = FAULT_CATALOG[cls]
        codes = [c[0] for c in catalog]
        descs = {c[0]: c[1] for c in catalog}
        weights = np.array([c[2] for c in catalog], dtype=float)
        weights /= weights.sum()
        base_repair = {c[0]: c[3] for c in catalog}

        age = st["install_age_hrs"]
        generation = st["generation"]
        faults_this_gen = 0
        replace_threshold = int(rng.integers(20, 30))  # faults before swap
        t = START

        while t < END:
            u = rng.random()
            interval = w["eta"] * (-math.log(1 - u)) ** (1 / w["beta"])
            interval *= max(0.3, 1.0 - age / (w["eta"] * 6))   # wear-out
            t_candidate = t + timedelta(hours=float(interval / 0.92))
            interval *= seasonal_fault_factor(t_candidate)      # season (yoy)
            t = t + timedelta(hours=float(interval / 0.92))
            age += interval
            if t >= END:
                break

            sid, crew, stype = lookup(t)
            if crew is None:
                continue

            # summer biases code selection toward thermal modes
            w_adj = weights.copy()
            s = summer_signal(t)
            if s > 0:
                for k, c in enumerate(codes):
                    if c in THERMAL_CODES:
                        w_adj[k] *= (1.0 + 0.8 * s * season_severity(t))
                w_adj /= w_adj.sum()
            code = codes[rng.choice(len(codes), p=w_adj)]

            # acute + reliability-program acceptance: extra faults appear via
            # a probabilistic "bonus" draw rather than reshaping the interval
            bonus = acute_fault_mult(t, code) * reliability_program_mult(t, code)
            # if bonus<1 (program), sometimes skip this fault; if >1, it stands
            if bonus < 1.0 and rng.random() > bonus:
                continue

            base = base_repair[code]
            repair = base * CREW_SKILL[crew]["mttr"] * rng.lognormal(0, 0.35)
            if stype == "night" and t.hour in (4, 5):
                repair *= 1.4   # handoff loss near shift end

            fault_rows.append(dict(
                fault_id=f"F{fault_seq:06d}", asset_id=asset_id,
                asset_class=cls, line=st["line"], station=st["station"],
                fault_code=code, fault_desc=descs[code], ts=t,
                shift_id=sid, crew=crew, shift_type=stype,
                generation=generation, downtime_min=round(float(repair), 1)))
            fault_seq += 1
            faults_this_gen += 1

            # extra faults during an acute spike (bonus>1): emit follow-ons
            extra = int(bonus) - 1
            for _ in range(max(0, extra)):
                if rng.random() < (bonus - int(bonus)) + 0.0:
                    pass
                fault_rows.append(dict(
                    fault_id=f"F{fault_seq:06d}", asset_id=asset_id,
                    asset_class=cls, line=st["line"], station=st["station"],
                    fault_code=code, fault_desc=descs[code],
                    ts=t + timedelta(minutes=float(rng.integers(5, 120))),
                    shift_id=sid, crew=crew, shift_type=stype,
                    generation=generation,
                    downtime_min=round(base * CREW_SKILL[crew]["mttr"]
                                       * rng.lognormal(0, 0.35), 1)))
                fault_seq += 1
                faults_this_gen += 1

            # replacement trigger (robots only)
            if (cls == "robot" and faults_this_gen >= replace_threshold
                    and t >= REPLACE_MIN_DATE and replacements_done < MAX_REPLACEMENTS):
                maint_rows.append(dict(
                    maint_id=f"M{maint_seq:05d}", asset_id=asset_id,
                    ts=t, maint_type="replacement",
                    detail=f"{asset_id} gen{generation}->gen{generation+1} "
                           f"(after {faults_this_gen} faults)",
                    downtime_min=round(float(rng.uniform(240, 480)), 1)))
                maint_seq += 1
                replacements_done += 1
                generation += 1
                age = float(rng.integers(50, 200))  # fresh unit
                faults_this_gen = 0
                replace_threshold = int(rng.integers(20, 30))

    # scheduled preventive maintenance (PM) -- one stream per asset
    for asset_id, st in asset_state.items():
        t = START + timedelta(days=float(rng.integers(5, 45)))
        while t < END:
            sid, crew, stype = lookup(t)
            maint_rows.append(dict(
                maint_id=f"M{maint_seq:05d}", asset_id=asset_id, ts=t,
                maint_type="preventive",
                detail="Scheduled PM",
                downtime_min=round(float(rng.uniform(30, 90)), 1)))
            maint_seq += 1
            t += timedelta(days=float(rng.integers(45, 70)))

    faults = pd.DataFrame(fault_rows).sort_values("ts").reset_index(drop=True)
    maint = pd.DataFrame(maint_rows).sort_values("ts").reset_index(drop=True)
    return faults, maint, replacements_done

# --------------------------------------------------------------------------
# 4. PRODUCTION + EVERY DEFECT (full fidelity)
# --------------------------------------------------------------------------
def build_production_and_defects(assets, faults, cal):
    # CREATION rate per station. Process stations (ST02-ST06) create defects;
    # ST07 Flash Test/QC and ST08 Packaging are inspection/handling and create
    # almost none -- they DETECT defects that originated upstream.
    CREATE_RATE = {
        "ST01": 0.0008, "ST02": 0.0035, "ST03": 0.0050, "ST04": 0.0028,
        "ST05": 0.0020, "ST06": 0.0015, "ST07": 0.0002, "ST08": 0.0001,
    }
    QC_IDX = STATION_ORDER["ST07"]   # primary inspection point
    FINAL = "ST08"
    P_LOCAL = 0.30                    # share caught at the creating station
    DEFECT_TYPES = ["delamination", "scribe_misalign", "cell_crack",
                    "frame_gap", "jbox_seal", "flash_underperf"]

    faults = faults.copy()
    faults["hour"] = faults["ts"].dt.floor("h")
    downtime_by = faults.groupby(["line", "hour"])["downtime_min"].sum()

    prod_rows = []
    # defect columns accumulated as lists (faster than dict-per-row)
    d_id, d_ts, d_line, d_det, d_root, d_crew, d_stype, d_type = \
        [], [], [], [], [], [], [], []
    defect_seq = 0

    for _, shift in cal.iterrows():
        t = shift["start"]; crew = shift["crew"]; stype = shift["shift_type"]
        fault_mult = CREW_SKILL[crew]["fault"]
        while t < shift["end"]:
            hour = t
            dem = demand_factor(hour)
            ci = ci_factor(hour)
            for line in LINES:
                dmin = float(downtime_by.get((line, hour), 0.0))
                avail = max(0.15, 1.0 - dmin / 60.0 / 3.0)
                rate_mult = 0.97 if stype == "night" else 1.0
                planned = int(NOMINAL_BASE * dem)
                produced = int(planned * avail * rate_mult * rng.uniform(0.92, 1.0))

                pressure = 0.0
                total_def = 0
                for sid in STATION_IDS:
                    idx = STATION_ORDER[sid]
                    # CREATION probability at this station (root cause = sid)
                    p = CREATE_RATE[sid] * fault_mult * ci
                    p *= process_defect_mult(hour, sid)
                    p *= new_product_defect_mult(hour, sid)
                    p *= acute_defect_mult(hour, sid)
                    if idx <= STATION_ORDER["ST06"]:
                        p += pressure                  # cascade hits process stns only
                    if stype == "night" and hour.hour == 5:
                        p *= 1.15
                    n_def = int(rng.binomial(produced, min(p, 0.5)))
                    total_def += n_def
                    if n_def > 0:
                        frac = n_def / max(produced, 1)
                        pressure += frac * 0.08        # light downstream cascade
                    if n_def == 0:
                        continue

                    # every defect (full fidelity). root cause = creating stn.
                    types = rng.choice(DEFECT_TYPES, size=n_def)
                    roots = np.full(n_def, sid, dtype=object)
                    det = np.empty(n_def, dtype=object)
                    u = rng.random(n_def)
                    local = u < P_LOCAL                # caught in-line at source
                    det[local] = sid
                    nl = ~local
                    m = int(nl.sum())
                    if m:
                        rr = rng.random(m)
                        if idx < QC_IDX:
                            # escapes downstream: mostly caught at QC, some at
                            # final, a few at an intermediate station
                            sub = np.where(rr < 0.72, "ST07",
                                   np.where(rr < 0.90, FINAL, "INTER"))
                            inter = sub == "INTER"
                            k = int(inter.sum())
                            if k:
                                ii = rng.integers(idx + 1, QC_IDX + 1, size=k)
                                sub[inter] = [STATION_IDS[z] for z in ii]
                            det[nl] = sub
                        else:
                            # created at/after QC -> caught at final mostly
                            det[nl] = np.where(rr < 0.6, FINAL, sid)

                    for k in range(n_def):
                        d_id.append(f"D{defect_seq:08d}")
                        d_ts.append(hour); d_line.append(line)
                        d_det.append(det[k]); d_root.append(roots[k])
                        d_crew.append(crew); d_stype.append(stype)
                        d_type.append(types[k]); defect_seq += 1

                prod_rows.append(dict(
                    ts=hour, line=line, shift_id=shift["shift_id"], crew=crew,
                    shift_type=stype, planned_units=planned,
                    produced_units=produced, scrap_units=total_def,
                    downtime_min=round(dmin, 1),
                    yield_pct=round(100 * (produced - total_def) / max(produced, 1), 2)))
            t += timedelta(hours=1)

    prod = pd.DataFrame(prod_rows)
    defects = pd.DataFrame(dict(
        defect_id=d_id, ts=d_ts, line=d_line, detected_station=d_det,
        root_cause_station=d_root, crew=d_crew, shift_type=d_stype,
        defect_type=d_type))
    return prod, defects

# --------------------------------------------------------------------------
# 5. SHIFT LOGS
# --------------------------------------------------------------------------
LOG_TEMPLATES = [
    "ran fine", "ran ok no issues", "no major issues. {asset} a little noisy keep an eye",
    "{asset} threw {code} again, reset and back up. ~{min}min",
    "{asset} down {min}min - {desc}. swapped part, monitor next shift",
    "{station} acting up all night. {code} x{n}. needs PM",
    "jam at {station} cleared. photo eye flaky",
    "{code} on {asset} - couldnt fully clear before EOS, handing to days",
    "vision drift on {asset}, recal'd. lost ~{min}",
    "slow start, {station} conveyor tracking off. adjusted",
    "{asset} estop twice, op error i think. logged",
    "bearing alarm {asset}, vibe high. flagged for maint",
    "good shift. caught up on backlog",
    "{n} jams total mostly {station}. nothing major",
    "drive overtemp {asset} - airflow blocked, cleaned",
    "hot in here tonight, drives running warm on {line}",
]

def build_shift_logs(cal, faults):
    rows = []
    f_by_shift = faults.groupby("shift_id")
    groups = f_by_shift.groups
    for _, shift in cal.iterrows():
        sid = shift["shift_id"]; crew = shift["crew"]; stype = shift["shift_type"]
        n_lines = rng.integers(1, 4) if stype == "night" else rng.integers(2, 6)
        sf = f_by_shift.get_group(sid) if sid in groups else None
        for _ in range(int(n_lines)):
            tmpl = rng.choice(LOG_TEMPLATES)
            if sf is not None and len(sf) and "{" in tmpl:
                fr = sf.sample(1, random_state=int(rng.integers(0, 1e6))).iloc[0]
                text = tmpl.format(asset=fr["asset_id"], code=fr["fault_code"],
                                   desc=fr["fault_desc"].lower(),
                                   station=fr["station"], line=fr["line"],
                                   min=int(fr["downtime_min"]),
                                   n=rng.integers(2, 6))
            else:
                text = rng.choice(["ran fine", "ran ok no issues",
                                   "no major issues", "good shift"])
            rows.append(dict(log_id=f"LOG-{len(rows):06d}", shift_id=sid,
                             crew=crew, shift_type=stype,
                             shift_date=shift["shift_date"], entry_text=text))
    return pd.DataFrame(rows)

# --------------------------------------------------------------------------
# 6. EVENTS DIMENSION (ground truth the dashboard/agent should "discover")
# --------------------------------------------------------------------------
def build_events():
    rows = []
    for start, end, scope, fmult, dmult, label in ACUTE_EVENTS:
        rows.append(dict(event_date=start, end_date=end, category="acute",
                         detail=label))
    for cdate, cstation, cmult, label in PROCESS_CHANGES:
        rows.append(dict(event_date=cdate, end_date=None,
                         category="process_change",
                         detail=f"{label} ({cstation}, x{cmult})"))
    rows.append(dict(event_date=NEW_PRODUCT_DATE, end_date=None,
                     category="new_product",
                     detail="New product variant introduced (ST04/ST05 learning curve)"))
    rows.append(dict(event_date=RELIABILITY_PROGRAM_DATE.isoformat(), end_date=None,
                     category="reliability_program",
                     detail="PM program expansion - mechanical faults reduced"))
    return pd.DataFrame(rows)

# --------------------------------------------------------------------------
# RUN
# --------------------------------------------------------------------------
if __name__ == "__main__":
    print("Building assets..."); assets = build_assets()
    print(f"  {len(assets)} assets")
    print("Building 3-year shift calendar..."); cal = build_shift_calendar()
    print(f"  {len(cal)} shifts")
    print("Simulating faults (aging + seasonality + acute + replacements + PM)...")
    faults, maint, n_repl = build_faults(assets, cal)
    print(f"  {len(faults)} faults | {len(maint)} maintenance events "
          f"({n_repl} replacements)")
    print("Simulating production + EVERY defect (full fidelity)...")
    prod, defects = build_production_and_defects(assets, faults, cal)
    print(f"  {len(prod)} line-hours | {len(defects)} defect records")
    print("Generating messy shift logs..."); logs = build_shift_logs(cal, faults)
    print(f"  {len(logs)} log entries")
    events = build_events()

    assets.to_csv(f"{OUT}/dim_asset.csv", index=False)
    cal.to_csv(f"{OUT}/dim_shift_calendar.csv", index=False)
    events.to_csv(f"{OUT}/dim_events.csv", index=False)
    faults.drop(columns=["ts"]).assign(ts=faults["ts"]).to_csv(
        f"{OUT}/fact_fault_events.csv", index=False)
    prod.to_csv(f"{OUT}/fact_production.csv", index=False)
    defects.to_csv(f"{OUT}/fact_defect_events.csv", index=False)
    maint.to_csv(f"{OUT}/fact_maintenance_events.csv", index=False)
    logs.to_csv(f"{OUT}/shift_logs.csv", index=False)
    print("\nDone. Files in ./output")
