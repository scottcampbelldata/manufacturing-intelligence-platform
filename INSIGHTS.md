# Automotive Assembly Intelligence - Report Findings

*Three years of plant telemetry (2023-2025): 35.3M units, 26,304 production hours
across 3 lines, ~727k defects, ~8k equipment faults. Every figure below traces
to a named SQL view over data that passes the integrity checks on the
Methodology panel. Fully synthetic, seeded, no proprietary data.*

This report is built to answer the questions automotive plant management asks,
not to display vanity metrics. Each finding maps to a decision.

---

## Executive: OEE and where output is lost

**Plant OEE = 90.3%** (Availability 93.0% x Performance 99.2% x Quality 97.9%),
consistent across all three lines. OEE is shown with its three loss buckets and
the formula, so a reviewer can see exactly how it is derived
(`v_oee`, `v_oee_by_line`).

**Where output is lost (no dollars - downtime hours + scrap units):**
Final Assembly and Paint are the largest combined loss sources; Spot Weld is the
single biggest scrap origin. Final Inspection shows high equipment downtime but
near-zero scrap origin - it *catches* defects, it does not create them, so
corrective spend belongs on the process stations upstream (`v_loss_by_station`).

> **Decision:** fix Paint and Final Assembly first; do not chase the inspection gate.

---

## The invisible night shift

D-crew (nights) takes ~26-31% longer to clear the *same* faults than the best
day crew, concentrated in the pre-handoff window. Same equipment, same fault
mix - the gap is repair speed and coverage, and it never appears in daily output
totals (`v_mttr_by_crew`, `v_shift_handoff_effect`).

> **Decision:** a staffing/coverage problem, not an equipment problem.

---

## Defect origin vs detection

~69% of defects are caught downstream of where they were created. The top three
process stations (Spot Weld, Paint, Final Assembly) create ~60% of all scrap,
but most of it surfaces at Final Inspection (`v_rootcause_ranking`,
`v_propagation`, `v_detection_ranking`).

> **Decision:** target quality effort at origin stations, not the detection gate.

---

## Did our fixes actually work? (event rediscovery)

The quality trend independently surfaces real operational events straight from
the fact tables, each matching the ground-truth log:

| Event (date) | Recovered from data |
|---|---|
| Weld-cell retooling (Apr 2024) | Spot-weld defects step down ~43%, permanently |
| Supplier fastener bad batch (Oct 2024) | Final-assembly defects spike, then recover |
| New model-year launch (Jan 2025) | Yield dip + recovery on Trim/Final Assembly |
| Paint-booth upgrade (Sep 2025) | Paint defects step down |
| PM / reliability program (Sep 2024) | Mechanical faults down ~17%, sustained |

> **Decision:** proof a process change moved the number - a step-change, not noise.

---

## Reliability: capital plan

Per-robot fault counts with a 2024-to-2025 trend flag produce a replace-or-overhaul
shortlist; several top contributors show a *rising* fault rate
(`v_robot_candidates`). Thermal faults track summer severity (2025 the worst heat
year), separating a seasonal pattern from a genuine regression (`v_summer_thermal`).

> **Decision:** schedule the rising-trend robots for overhaul before next year.

---

## Trust: methodology & validation

A dedicated panel shows row counts, referential-integrity checks (orphan faults,
orphan shift links), yield reconciliation, null checks, the date range, and the
provenance + seed (`v_validation`). All integrity checks pass. This is the
"where did this come from and why can you trust it" section desk dashboards omit.

---

## Sections in the live report
Executive (OEE + KPIs) · Where output is lost · Shift analysis · Defect origin vs
detection · Event rediscovery · Reliability & capital plan · Methodology &
validation. Each carries a plain-English "what this means / what to do" read.
