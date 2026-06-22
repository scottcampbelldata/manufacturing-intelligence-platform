"use client";
import { useEffect, useState } from "react";
import {
  api,
  Kpi,
  Oee,
  OeeLine,
  StationLoss,
  MttrCrew,
  Handoff,
  RootCause,
  Propagation,
  YieldQuarter,
  SummerThermal,
  ReplaceCandidate,
  FactoryEvent,
  ValidationCheck,
  Provenance,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { KpiCards } from "@/components/KpiCards";
import { OeePanel } from "@/components/Oee";
import {
  MttrByCrewChart,
  DefectOriginChart,
  YieldTrendChart,
  SummerSeverityChart,
} from "@/components/Charts";
import {
  Takeaway,
  LossByStation,
  ReplaceCandidates,
  MethodologyPanel,
  ArchitectureStrip,
  SystemProof,
} from "@/components/Sections";

interface Data {
  kpi: Kpi;
  oee: Oee;
  oeeByLine: OeeLine[];
  loss: StationLoss[];
  mttr: MttrCrew[];
  handoff: Handoff[];
  rootCause: RootCause[];
  propagation: Propagation;
  yieldQ: YieldQuarter[];
  summer: SummerThermal[];
  candidates: ReplaceCandidate[];
  events: FactoryEvent[];
  validation: ValidationCheck[];
  provenance: Provenance;
}

export default function Report() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.kpi(), api.oee(), api.oeeByLine(), api.lossByStation(),
      api.mttrByCrew(), api.handoff(), api.rootCause(), api.propagation(),
      api.yieldByQuarter(), api.summerThermal(), api.replaceCandidates(),
      api.events(), api.validation(), api.provenance(),
    ])
      .then(([kpi, oee, oeeByLine, loss, mttr, handoff, rootCause, propagation,
              yieldQ, summer, candidates, events, validation, provenance]) =>
        setD({ kpi, oee, oeeByLine, loss, mttr, handoff, rootCause, propagation,
               yieldQ, summer, candidates, events, validation, provenance }))
      .catch((e) => setErr(String(e)));
  }, []);

  if (err)
    return (
      <main className="max-w-6xl mx-auto p-8">
        <p className="text-accent">Failed to reach the API: {err}</p>
        <p className="text-mute text-sm mt-2">
          Check NEXT_PUBLIC_API_BASE and that the FastAPI service is running.
        </p>
      </main>
    );
  if (!d)
    return <main className="max-w-6xl mx-auto p-8 text-mute">Loading report…</main>;

  const dCrew = [...d.mttr].sort((a, b) => b.mttr_min - a.mttr_min)[0];
  const aCrew = [...d.mttr].sort((a, b) => a.mttr_min - b.mttr_min)[0];
  const crewGap = aCrew ? Math.round((100 * (dCrew.mttr_min - aCrew.mttr_min)) / aCrew.mttr_min) : 0;
  const topLoss = d.loss[0];
  const top3 = d.rootCause.slice(0, 3).reduce((s, r) => s + r.pct_of_all, 0).toFixed(0);
  const risingCount = d.candidates.filter((c) => c.trend === "rising").length;

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-7">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <div className="eyebrow mb-1">Operations Analytics Report</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Automotive Assembly Intelligence
          </h1>
          <p className="text-mute text-sm mt-1 max-w-2xl">
            Three years of plant telemetry (2023–2025) across body, paint,
            trim/chassis, and final inspection — answering the questions a plant
            manager actually asks: where am I losing output, which station to fix
            first, and which equipment to budget for replacement.
          </p>
        </div>
        <span className="badge">
          <span className="badge-dot" /> synthetic · seeded · no proprietary data
        </span>
      </header>

      {/* Executive */}
      <KpiCards kpi={d.kpi} />
      <OeePanel oee={d.oee} byLine={d.oeeByLine} />

      {/* Where output is lost */}
      <Card
        eyebrow="Decision · fix first"
        title="Where output is lost"
        subtitle="Equipment downtime (hours) and scrap (units) by station, ranked. No dollar assumptions — raw operational loss."
      >
        <LossByStation data={d.loss} />
        <Takeaway>
          {topLoss.station_name} is the largest combined loss source
          ({topLoss.downtime_hrs.toLocaleString()} downtime hours and{" "}
          {topLoss.scrap_units.toLocaleString()} scrap units over three years).
          Note that Final Inspection shows high downtime but near-zero scrap origin
          — it catches defects, it does not create them, so corrective spend
          belongs on the process stations above it.
        </Takeaway>
      </Card>

      {/* Shift analysis */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card
          eyebrow="Decision · crew support"
          title="The invisible night shift"
          subtitle="Mean time to repair by crew. Same equipment, same faults — the gap is repair speed."
        >
          <MttrByCrewChart data={d.mttr} />
          <Takeaway>
            D-crew (nights) takes {crewGap}% longer to clear the same faults than
            the best day crew, concentrated in the pre-handoff window. This is a
            staffing/coverage problem, not an equipment problem — it never shows
            up in daily output totals.
          </Takeaway>
        </Card>
        <Card
          eyebrow="Decision · quality focus"
          title="Defect origin vs detection"
          subtitle={`${d.propagation.pct_detected_downstream}% of defects are caught downstream of where they were created.`}
        >
          <DefectOriginChart data={d.rootCause} />
          <Takeaway>
            The top three process stations create {top3}% of all scrap, but most
            of it is caught later at Final Inspection. Quality effort should target
            the origin stations, not the inspection gate where the defects surface.
          </Takeaway>
        </Card>
      </section>

      {/* Trends / event rediscovery */}
      <Card
        eyebrow="Validation · did our fixes work?"
        title="Quality trend rediscovers real operational events"
        subtitle="The trend layer surfaces the weld-cell retooling, supplier bad batch, and model-year launch directly from the data — no manual labels."
      >
        <YieldTrendChart data={d.yieldQ} />
        <Takeaway>
          Each annotated event was recovered from the fact tables alone and
          matches the ground-truth event log. This is the proof a process change
          actually moved the number — the weld-cell retooling shows a permanent
          step-down in scrap, not noise.
        </Takeaway>
      </Card>

      {/* Reliability */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card
          eyebrow="Decision · capital plan"
          title="Robots to budget for replacement"
          subtitle="Fault count and year-over-year trend per robot — the replace-or-overhaul shortlist."
        >
          <ReplaceCandidates data={d.candidates} />
          <Takeaway>
            {risingCount} of the top contributors show a rising fault rate from
            2024 to 2025 — these are the units to schedule for overhaul or
            replacement before they drive unplanned downtime next year.
          </Takeaway>
        </Card>
        <Card
          eyebrow="Context · seasonality"
          title="No two summers alike"
          subtitle="Heat-sensitive faults (drives, servo guns, VFDs, paint bells) by summer."
        >
          <SummerSeverityChart data={d.summer} />
          <Takeaway>
            Thermal faults track summer severity, with 2025 the worst heat year.
            This separates a recurring seasonal pattern from a genuine reliability
            regression — important when judging whether a bad month is a trend.
          </Takeaway>
        </Card>
      </section>

      <Card
        eyebrow="System proof"
        title="Built as a real analytics pipeline"
        subtitle="The dashboard is the last mile of a reproducible data product: generation, schema, validation, API, deployment, and frontend are all present in the repo."
      >
        <ArchitectureStrip />
        <div className="mt-5">
          <SystemProof />
        </div>
      </Card>

      {/* Methodology */}
      <Card
        eyebrow="Trust · is this right?"
        title="Methodology & data validation"
        subtitle="Row counts, referential-integrity checks, reconciliation, and provenance. Every figure above traces to a named SQL view over this validated data."
      >
        <MethodologyPanel checks={d.validation} provenance={d.provenance} />
      </Card>

      <footer className="text-xs text-faint pt-4 border-t border-edge">
        Built by Scott Campbell · FastAPI · PostgreSQL/TimescaleDB · Next.js ·
        Recharts · nginx. Dataset fully synthetic and reproducible (seeded
        generator); no proprietary or employer data.
      </footer>
    </main>
  );
}
