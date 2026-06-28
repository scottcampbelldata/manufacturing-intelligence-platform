"use client";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart,
  Legend,
} from "recharts";
import {
  MttrCrew,
  RootCause,
  YieldQuarter,
  SummerThermal,
} from "@/lib/api";
import { axisTick, chart, MONO, thermalRamp } from "@/lib/theme";

const AXIS = axisTick;
const GRID = chart.grid;

function tip(content: any) {
  return (
    <Tooltip
      // Recharts' default hover cursor is a light-gray rectangle, which reads as
      // a white slab on the dark theme. Use a subtle translucent highlight.
      cursor={{ fill: "rgba(148,163,191,0.08)" }}
      contentStyle={{
        background: chart.panel2,
        border: `1px solid ${chart.edge}`,
        borderRadius: 10,
        boxShadow: "0 12px 30px -12px rgba(0,0,0,0.8)",
        padding: "0.55rem 0.7rem",
      }}
      labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: 4 }}
      itemStyle={{ color: chart.text, fontFamily: MONO, fontSize: 12 }}
      {...content}
    />
  );
}

export function MttrByCrewChart({ data }: { data: MttrCrew[] }) {
  const sorted = [...data].sort((a, b) => a.crew.localeCompare(b.crew));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="crew" tick={AXIS} />
        <YAxis tick={AXIS} unit="m" />
        {tip({})}
        <Bar dataKey="mttr_min" name="MTTR (min)" radius={[6, 6, 0, 0]}>
          {sorted.map((d) => (
            <Cell key={d.crew} fill={d.crew === "D" ? chart.signal : chart.steel} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DefectOriginChart({ data }: { data: RootCause[] }) {
  const sorted = [...data].sort((a, b) => b.defects_caused - a.defects_caused);
  let cum = 0;
  const total = sorted.reduce((s, d) => s + d.defects_caused, 0);
  const rows = sorted.map((d, i) => {
    cum += d.defects_caused;
    return {
      name: d.station_name,
      defects: Math.round(d.defects_caused / 1000),
      cumPct: Math.round((100 * cum) / total),
      top: i < 3,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} angle={-25} textAnchor="end" interval={0} />
        <YAxis yAxisId="l" tick={AXIS} />
        <YAxis yAxisId="r" orientation="right" tick={AXIS} unit="%" domain={[0, 100]} />
        {tip({})}
        <Bar yAxisId="l" dataKey="defects" name="defects (000s)" radius={[6, 6, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.top ? chart.signal : chart.steel} />
          ))}
        </Bar>
        <Line yAxisId="r" dataKey="cumPct" name="cumulative %" stroke={chart.text} strokeWidth={2} dot={{ r: 3, fill: chart.text }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function YieldTrendChart({ data }: { data: YieldQuarter[] }) {
  const rows = data.map((d) => ({ ...d, q: d.qtr.slice(0, 7) }));
  // row staggers the label height; anchor points it away from its neighbour so
  // the close-together Oct-2024 / Jan-2025 events never collide.
  const events: { q: string; label: string; row: number; anchor: "start" | "end" }[] = [
    { q: "2024-04", label: "weld retooling", row: 0, anchor: "start" },
    { q: "2024-10", label: "bad batch", row: 1, anchor: "end" },
    { q: "2025-01", label: "model-year launch", row: 0, anchor: "start" },
  ];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 28, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="q" tick={AXIS} />
        <YAxis tick={AXIS} unit="%" domain={["auto", "auto"]} />
        {tip({})}
        {events.map((e) => (
          <ReferenceLine
            key={e.q}
            x={e.q}
            stroke={chart.signal}
            strokeDasharray="4 4"
            label={({ viewBox }: any) => (
              <text
                x={e.anchor === "end" ? viewBox.x - 6 : viewBox.x + 6}
                y={viewBox.y + 12 + e.row * 15}
                fill={chart.signal}
                fontSize={11}
                textAnchor={e.anchor}
              >
                {e.label}
              </text>
            )}
          />
        ))}
        <Line dataKey="avg_yield" name="avg yield" stroke={chart.text} strokeWidth={2.5} dot={{ r: 3, fill: chart.text }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SummerSeverityChart({ data }: { data: SummerThermal[] }) {
  const rows = data.map((d) => ({ yr: String(d.yr), n: d.thermal_faults }));
  const palette = thermalRamp;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="yr" tick={AXIS} />
        <YAxis tick={AXIS} />
        {tip({})}
        <Bar dataKey="n" name="thermal faults" radius={[6, 6, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
