"use client";
import { Oee, OeeLine } from "@/lib/api";
import { chart, MONO } from "@/lib/theme";

function Donut({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <svg viewBox="0 0 140 140" className="w-[140px] h-[140px]">
      <circle cx="70" cy="70" r={r} fill="none" stroke={chart.edge} strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={chart.good}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 70 70)"
      />
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fontSize="30"
        fontWeight="600"
        fill="#fff"
        fontFamily={MONO}
      >
        {value.toFixed(1)}
      </text>
      <text x="70" y="88" textAnchor="middle" fontSize="11" fill={chart.mute} letterSpacing="1.5">
        OEE %
      </text>
    </svg>
  );
}

function Component({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-mute">{label}</span>
        <span className="text-white font-semibold">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-edge overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${chart.steel}, ${chart.good})`,
          }}
        />
      </div>
    </div>
  );
}

export function OeePanel({ oee, byLine }: { oee: Oee; byLine: OeeLine[] }) {
  return (
    <div className="card">
      <div className="eyebrow mb-1">Overall Equipment Effectiveness</div>
      <div className="section-title mb-4">Plant OEE and its three loss buckets</div>
      <div className="grid md:grid-cols-[160px_1fr] gap-6 items-center">
        <div className="flex justify-center">
          <Donut value={oee.oee_pct} />
        </div>
        <div className="space-y-3">
          <Component label="Availability (uptime)" value={oee.availability_pct} />
          <Component label="Performance (speed)" value={oee.performance_pct} />
          <Component label="Quality (first-pass)" value={oee.quality_pct} />
          <div className="text-xs text-faint pt-1 font-mono">
            OEE = A x P x Q = {oee.availability_pct}% x {oee.performance_pct}% x{" "}
            {oee.quality_pct}% = {oee.oee_pct}%
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-edge">
        <div className="text-xs text-faint uppercase tracking-wider mb-2">
          By line
        </div>
        <table className="data w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1">Line</th>
              <th>Availability</th>
              <th>Performance</th>
              <th>Quality</th>
              <th className="text-right">OEE</th>
            </tr>
          </thead>
          <tbody>
            {byLine.map((l) => (
              <tr key={l.line}>
                <td className="py-1.5 font-mono">{l.line}</td>
                <td>{l.availability_pct}%</td>
                <td>{l.performance_pct}%</td>
                <td>{l.quality_pct}%</td>
                <td className="text-right font-semibold text-white">{l.oee_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
