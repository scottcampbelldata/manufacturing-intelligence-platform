import { Kpi } from "@/lib/api";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString();
}

export function KpiCards({ kpi }: { kpi: Kpi }) {
  const cards = [
    { value: fmt(kpi.total_produced), label: "Units produced", sub: "across 3 years" },
    { value: kpi.yield_pct.toFixed(2) + "%", label: "Overall yield", sub: "first-pass" },
    { value: fmt(kpi.total_scrap), label: "Defects tracked", sub: "every record" },
    { value: fmt(kpi.total_faults), label: "Equipment faults", sub: "with downtime" },
    {
      value: fmt(kpi.production_hours),
      label: "Production hours",
      sub: "3 lines, hourly",
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="kpi">
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
