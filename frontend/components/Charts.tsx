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

const AXIS = { fill: "#9aa6bf", fontSize: 12 };
const GRID = "#243049";

function tip(content: any) {
  return (
    <Tooltip
      contentStyle={{
        background: "#0f1729",
        border: "1px solid #243049",
        borderRadius: 8,
        color: "#e6ecf7",
      }}
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
        <Bar dataKey="mttr_min" radius={[6, 6, 0, 0]}>
          {sorted.map((d) => (
            <Cell key={d.crew} fill={d.crew === "D" ? "#c8472b" : "#5b6bb8"} />
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
            <Cell key={i} fill={r.top ? "#c8472b" : "#5b6bb8"} />
          ))}
        </Bar>
        <Line yAxisId="r" dataKey="cumPct" name="cumulative %" stroke="#e6ecf7" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function YieldTrendChart({ data }: { data: YieldQuarter[] }) {
  const rows = data.map((d) => ({ ...d, q: d.qtr.slice(0, 7) }));
  const events: { q: string; label: string }[] = [
    { q: "2026-04", label: "laser upgrade" },
    { q: "2026-10", label: "bad batch" },
    { q: "2027-01", label: "new product" },
  ];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="q" tick={AXIS} />
        <YAxis tick={AXIS} unit="%" domain={["auto", "auto"]} />
        {tip({})}
        {events.map((e) => (
          <ReferenceLine
            key={e.q}
            x={e.q}
            stroke="#c8472b"
            strokeDasharray="4 4"
            label={{ value: e.label, fill: "#c8472b", fontSize: 11, position: "insideTopRight", angle: 0 }}
          />
        ))}
        <Line dataKey="avg_yield" name="avg yield" stroke="#e6ecf7" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SummerSeverityChart({ data }: { data: SummerThermal[] }) {
  const rows = data.map((d) => ({ yr: String(d.yr), n: d.thermal_faults }));
  const palette = ["#5b6bb8", "#2f7d5b", "#c8472b"];
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
