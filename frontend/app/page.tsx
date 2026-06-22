"use client";
import { useEffect, useState } from "react";
import {
  api,
  Kpi,
  MttrCrew,
  Handoff,
  RootCause,
  Propagation,
  YieldQuarter,
  SummerThermal,
  TopAsset,
  FactoryEvent,
} from "@/lib/api";
import { Card } from "@/components/Card";
import { KpiCards } from "@/components/KpiCards";
import {
  MttrByCrewChart,
  DefectOriginChart,
  YieldTrendChart,
  SummerSeverityChart,
} from "@/components/Charts";

interface Data {
  kpi: Kpi;
  mttr: MttrCrew[];
  handoff: Handoff[];
  rootCause: RootCause[];
  propagation: Propagation;
  yieldQ: YieldQuarter[];
  summer: SummerThermal[];
  topAssets: TopAsset[];
  events: FactoryEvent[];
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.kpi(),
      api.mttrByCrew(),
      api.handoff(),
      api.rootCause(),
      api.propagation(),
      api.yieldByQuarter(),
      api.summerThermal(),
      api.topAssets(),
      api.events(),
    ])
      .then(([kpi, mttr, handoff, rootCause, propagation, yieldQ, summer, topAssets, events]) =>
        setData({ kpi, mttr, handoff, rootCause, propagation, yieldQ, summer, topAssets, events })
      )
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
  if (!data)
    return <main className="max-w-6xl mx-auto p-8 text-mute">Loading analytics...</main>;

  const dayHandoff = data.handoff.find((h) => h.time_window === "night_handoff_window");
  const normalNight = data.handoff.find(
    (h) => h.shift_type === "night" && h.time_window === "normal"
  );
  const handoffPct =
    dayHandoff && normalNight
      ? Math.round((100 * (dayHandoff.mttr_min - normalNight.mttr_min)) / normalNight.mttr_min)
      : null;

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Manufacturing Intelligence Pipeline
        </h1>
        <p className="text-mute text-sm">
          Executive analytics over a 3-year, multi-station robotic assembly line.
          Synthetic dataset modeled on reliability-engineering and
          manufacturing-operations principles — no proprietary data.
        </p>
      </header>

      <KpiCards kpi={data.kpi} />

      {/* Shift analysis */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card
          title="The invisible night shift"
          subtitle={
            handoffPct !== null
              ? `D-crew repairs run longest; the 4-5am handoff window adds a ${handoffPct}% penalty.`
              : "Repair speed by crew."
          }
        >
          <MttrByCrewChart data={data.mttr} />
        </Card>
        <Card
          title="Defect origin (Pareto)"
          subtitle={`${data.propagation.pct_detected_downstream}% of defects are caught downstream of where they were created.`}
        >
          <DefectOriginChart data={data.rootCause} />
        </Card>
      </section>

      {/* Trends / event rediscovery */}
      <Card
        title="Yield trend rediscovers real operational events"
        subtitle="The trend layer surfaces the laser upgrade, supplier bad batch, and new-product intro with no labels."
      >
        <YieldTrendChart data={data.yieldQ} />
      </Card>

      {/* Reliability */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card
          title="No two summers alike"
          subtitle="Thermal faults by summer — year-over-year season severity."
        >
          <SummerSeverityChart data={data.summer} />
        </Card>
        <Card title="Worst-performing assets" subtitle="Top fault contributors over 3 years.">
          <div className="overflow-auto max-h-[260px]">
            <table className="w-full text-sm">
              <thead className="text-mute text-left sticky top-0 bg-panel">
                <tr>
                  <th className="py-1">Asset</th>
                  <th>Station</th>
                  <th className="text-right">Faults</th>
                  <th className="text-right">Avg repair</th>
                </tr>
              </thead>
              <tbody>
                {data.topAssets.map((a) => (
                  <tr key={a.asset_id} className="border-t border-edge">
                    <td className="py-1 font-mono">{a.asset_id}</td>
                    <td>{a.station}</td>
                    <td className="text-right">{a.faults}</td>
                    <td className="text-right">{a.avg_repair_min} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Event answer-key */}
      <Card
        title="Operational events (ground truth)"
        subtitle="The analytics above independently surface these from the fact tables."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.events.map((e, i) => (
            <div key={i} className="border border-edge rounded-lg p-3">
              <div className="text-xs text-accent uppercase tracking-wide">
                {e.category.replace(/_/g, " ")}
              </div>
              <div className="text-sm mt-1">{e.detail}</div>
              <div className="text-xs text-mute mt-1">{e.event_date}</div>
            </div>
          ))}
        </div>
      </Card>

      <footer className="text-xs text-mute pt-4 border-t border-edge">
        Built by Scott Campbell. FastAPI · PostgreSQL/TimescaleDB · Next.js ·
        Recharts. Data is fully synthetic and reproducible (seeded generator).
      </footer>
    </main>
  );
}
