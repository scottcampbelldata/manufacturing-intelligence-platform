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
import { crewGap, risingCount, top3Pct, topLoss } from "@/lib/derive";
import { Card } from "@/components/Card";
import { ReportSkeleton } from "@/components/Skeleton";
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
      api.kpi(),
      api.oee(),
      api.oeeByLine(),
      api.lossByStation(),
      api.mttrByCrew(),
      api.handoff(),
      api.rootCause(),
      api.propagation(),
      api.yieldByQuarter(),
      api.summerThermal(),
      api.replaceCandidates(),
      api.events(),
      api.validation(),
      api.provenance(),
    ])
      .then(
        ([
          kpi,
          oee,
          oeeByLine,
          loss,
          mttr,
          handoff,
          rootCause,
          propagation,
          yieldQ,
          summer,
          candidates,
          events,
          validation,
          provenance,
        ]) =>
          setD({
            kpi,
            oee,
            oeeByLine,
            loss,
            mttr,
            handoff,
            rootCause,
            propagation,
            yieldQ,
            summer,
            candidates,
            events,
            validation,
            provenance,
          })
      )
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return (
      <main className="max-w-6xl mx-auto p-8">
        <Card eyebrow="Connection error" title="Couldn't load the report">
          <p className="text-mute text-sm leading-relaxed">
            The dashboard could not reach the analytics API. This is usually
            transient -- try refreshing in a moment. If it persists, confirm the
            API service is running and that{" "}
            <code className="text-faint">NEXT_PUBLIC_API_BASE</code> points to it.
          </p>
          <p className="text-faint text-xs mt-3 font-mono break-all">{err}</p>
        </Card>
      </main>
    );
  }

  if (!d) {
    return <ReportSkeleton />;
  }

  const gap = crewGap(d.mttr);
  const lead = topLoss(d.loss)!;
  const top3 = top3Pct(d.rootCause);
  const rising = risingCount(d.candidates);

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <div className="eyebrow mb-1">Operations Analytics Report</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Automotive Assembly Intelligence
          </h1>
          <p className="text-mute text-base md:text-[1.05rem] mt-2 max-w-3xl leading-relaxed">
            Three years of synthetic assembly-line data modeled through a
            production-style analytics pipeline. The report identifies output
            loss, quality escapes, repair gaps, trend shifts, and replacement
            priorities.
          </p>
        </div>
        <span className="badge">
          <span className="badge-dot" /> synthetic - seeded - no proprietary data
        </span>
      </header>

      <KpiCards kpi={d.kpi} />
      <OeePanel oee={d.oee} byLine={d.oeeByLine} />

      <Card
        eyebrow="Decision - fix first"
        title="Where output is lost"
        subtitle="Equipment downtime (hours) and scrap (units) by station, ranked. No dollar assumptions - raw operational loss."
      >
        <LossByStation data={d.loss} />
        <Takeaway>
          {lead.station_name} is the largest combined loss source (
          {lead.downtime_hrs.toLocaleString()} downtime hours and{" "}
          {lead.scrap_units.toLocaleString()} scrap units over three years).
          Final Inspection shows high downtime but near-zero scrap origin: it
          catches defects, it does not create them, so corrective spend belongs
          on the process stations above it.
        </Takeaway>
      </Card>

      <section className="grid md:grid-cols-2 gap-6">
        <Card
          eyebrow="Decision - crew support"
          title="The invisible night shift"
          subtitle="Mean time to repair by crew. Same equipment, same faults - the gap is repair speed."
        >
          <MttrByCrewChart data={d.mttr} />
          <Takeaway>
            D-crew (nights) takes {gap}% longer to clear the same faults than
            the best day crew, concentrated in the pre-handoff window. This is a
            staffing and coverage problem, not an equipment problem, and it does
            not show up in daily output totals.
          </Takeaway>
        </Card>
        <Card
          eyebrow="Decision - quality focus"
          title="Defect origin vs detection"
          subtitle={`${d.propagation.pct_detected_downstream}% of defects are caught downstream of where they were created.`}
        >
          <DefectOriginChart data={d.rootCause} />
          <Takeaway>
            The top three process stations create {top3}% of all scrap, but most
            of it is caught later at Final Inspection. Quality effort should
            target the origin stations, not the inspection gate where the defects
            surface.
          </Takeaway>
        </Card>
      </section>

      <Card
        eyebrow="Validation - did our fixes work?"
        title="Quality trend rediscovers real operational events"
        subtitle="The trend layer surfaces the weld-cell retooling, supplier bad batch, and model-year launch directly from the data - no manual labels."
      >
        <YieldTrendChart data={d.yieldQ} />
        <Takeaway>
          Each annotated event was recovered from the fact tables alone and
          matches the ground-truth event log. This is the proof a process change
          actually moved the number: the weld-cell retooling shows a permanent
          step-down in scrap, not noise.
        </Takeaway>
      </Card>

      <section className="grid md:grid-cols-2 gap-6">
        <Card
          eyebrow="Decision - capital plan"
          title="Robots to budget for replacement"
          subtitle="Fault count and year-over-year trend per robot - the replace-or-overhaul shortlist."
        >
          <ReplaceCandidates data={d.candidates} />
          <Takeaway>
            {rising} of the top contributors show a rising fault rate from
            2024 to 2025. These are the units to schedule for overhaul or
            replacement before they drive unplanned downtime next year.
          </Takeaway>
        </Card>
        <Card
          eyebrow="Context - seasonality"
          title="No two summers alike"
          subtitle="Heat-sensitive faults (drives, servo guns, VFDs, paint bells) by summer."
        >
          <SummerSeverityChart data={d.summer} />
          <Takeaway>
            Thermal faults track summer severity, with 2025 the worst heat year.
            This separates a recurring seasonal pattern from a genuine
            reliability regression, which matters when judging whether a bad
            month is a trend.
          </Takeaway>
        </Card>
      </section>

      <Card
        eyebrow="System proof"
        title="Built as a production-style analytics pipeline"
        subtitle="The dashboard is the last mile of a reproducible data product: generation, schema, validation, API, deployment, and frontend are all present in the repo."
      >
        <ArchitectureStrip />
        <div className="mt-5">
          <SystemProof />
        </div>
      </Card>

      <Card
        eyebrow="Trust - is this right?"
        title="Methodology & data validation"
        subtitle="Row counts, referential-integrity checks, reconciliation, and provenance. Every figure above traces to a named SQL view over this validated data."
      >
        <MethodologyPanel checks={d.validation} provenance={d.provenance} />
      </Card>

      <footer className="text-xs text-faint pt-4 border-t border-edge">
        Built by Scott Campbell with FastAPI, PostgreSQL/TimescaleDB, Next.js,
        Recharts, and nginx. Built with fully synthetic, seeded, reproducible
        data. No proprietary or employer data used.
      </footer>
    </main>
  );
}
