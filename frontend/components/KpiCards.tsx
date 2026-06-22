import { Kpi } from "@/lib/api";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toLocaleString();
}

export function KpiCards({ kpi }: { kpi: Kpi }) {
  const cards = [
    { label: "Units produced (3 yr)", value: fmt(kpi.total_produced) },
    { label: "Overall yield", value: kpi.yield_pct.toFixed(2) + "%" },
    { label: "Total scrap", value: fmt(kpi.total_scrap) },
    {
      label: "Downtime hours",
      value: fmt(Math.round(kpi.total_downtime_min / 60)),
    },
    { label: "Line-hours analyzed", value: fmt(kpi.line_hours) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
