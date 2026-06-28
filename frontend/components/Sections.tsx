"use client";

import { useState } from "react";
import { StationLoss, ReplaceCandidate, ValidationCheck, Provenance } from "@/lib/api";
import { useChartPalette } from "@/lib/useTheme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://factory-api.scottcampbell.io";
const REPO_BASE = "https://github.com/scottcampbelldata/manufacturing-intelligence-platform";

export function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-lg border border-edge bg-[var(--panel-2)] p-3">
      <div className="text-accent text-xs font-semibold uppercase tracking-wider shrink-0 pt-0.5">
        Read
      </div>
      <p className="text-sm text-mute leading-relaxed">{children}</p>
    </div>
  );
}

export function LossByStation({ data }: { data: StationLoss[] }) {
  const chart = useChartPalette();
  const max = Math.max(...data.map((d) => d.loss_index), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.station}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-strong">
              <span className="text-faint font-mono mr-2">{i + 1}</span>
              {d.station_name}
            </span>
            <span className="text-mute">
              {d.downtime_hrs.toLocaleString()} hrs down - {d.scrap_units.toLocaleString()} scrap
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-edge overflow-hidden flex">
            <div
              className="h-full"
              style={{
                width: `${(d.downtime_idx / max) * 100 * 0.5}%`,
                background: chart.steel,
              }}
              title="downtime"
            />
            <div
              className="h-full"
              style={{
                width: `${(d.scrap_idx / max) * 100 * 0.5}%`,
                background: chart.signal,
              }}
              title="scrap"
            />
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-xs text-faint pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: chart.steel }} />
          downtime hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: chart.signal }} />
          scrap units
        </span>
      </div>
    </div>
  );
}

export function ReplaceCandidates({ data }: { data: ReplaceCandidate[] }) {
  return (
    <div className="overflow-auto">
      <table className="data w-full">
        <thead>
          <tr className="text-left">
            <th className="py-1">Robot</th>
            <th>Station</th>
            <th className="text-right">Faults</th>
            <th className="text-right">2024 - 2025</th>
            <th className="text-right">Avg repair</th>
            <th className="text-right">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.asset_id}>
              <td className="py-1.5 font-mono">{r.asset_id}</td>
              <td>{r.station}</td>
              <td className="text-right">{r.total_faults}</td>
              <td className="text-right text-mute">
                {r.faults_prior} - {r.faults_recent}
              </td>
              <td className="text-right">{r.avg_repair_min}m</td>
              <td className="text-right">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    r.trend === "rising"
                      ? "text-accent border border-accent/40"
                      : "text-mute border border-edge"
                  }`}
                >
                  {r.trend}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MethodologyPanel({
  checks,
  provenance,
}: {
  checks: ValidationCheck[];
  provenance: Provenance;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs text-faint uppercase tracking-wider mb-3">
          Data-integrity checks
        </div>
        <table className="data w-full">
          <tbody>
            {checks.map((c) => (
              <tr key={c.check_name}>
                <td className="py-1.5 text-mute">{c.check_name}</td>
                <td className="text-right font-mono">{c.value}</td>
                <td className="text-right pl-3 w-16">
                  {c.status === "pass" && (
                    <span className="text-good text-xs font-semibold">PASS</span>
                  )}
                  {c.status === "fail" && (
                    <span className="text-accent text-xs font-semibold">FAIL</span>
                  )}
                  {c.status === "info" && <span className="text-faint text-xs">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="text-xs text-faint uppercase tracking-wider mb-3">
          Provenance & method
        </div>
        <p className="text-sm text-mute mb-3">{provenance.source}</p>
        <ul className="text-sm text-mute space-y-1.5 mb-3">
          {provenance.modeling.map((m, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent">-</span>
              {m}
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint font-mono">
          seed = {provenance.seed} - reproducible - no proprietary data
        </p>
        <p className="text-xs text-faint mt-2">{provenance.oee_definition}</p>
      </div>
    </div>
  );
}

export function ArchitectureStrip() {
  const steps = [
    "Seeded synthetic event generator",
    "PostgreSQL star schema",
    "Python validation checks",
    "FastAPI endpoints",
    "Next.js analytics report",
  ];

  return (
    <div className="architecture-strip">
      {steps.map((step, i) => (
        <div key={step} className="architecture-step">
          <span>{step}</span>
          {i < steps.length - 1 && <span className="architecture-arrow">-&gt;</span>}
        </div>
      ))}
    </div>
  );
}

export function SystemProof() {
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const proof = [
    ["Data source", "Synthetic factory dataset generated by a seeded Python model"],
    ["Pipeline", "Python generator and loader -> PostgreSQL -> FastAPI -> Next.js"],
    ["Database", "Star schema with fact tables, dimensions, indexes, and analytical views"],
    ["Validation", "Row counts, foreign-key checks, null checks, and yield reconciliation"],
    ["Deployment", "VPS-hosted API with Cloudflare-hosted static frontend"],
    ["Refresh", "Reproducible generation and reload process documented in the repo"],
  ];
  const links = [
    ["View schema", `${REPO_BASE}/blob/main/db/schema.sql`],
    ["View API health", `${API_BASE}/health`],
    ["View methodology", `${API_BASE}/api/methodology`],
    ["View GitHub", REPO_BASE],
  ];

  return (
    <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
      <div className="grid sm:grid-cols-2 gap-3">
        {proof.map(([label, value]) => (
          <div key={label} className="proof-item">
            <div className="proof-label">{label}</div>
            <div className="proof-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="proof-links">
        <button
          type="button"
          className="proof-link"
          onClick={() => setArchitectureOpen(true)}
        >
          View architecture
        </button>
        {links.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="proof-link">
            {label}
          </a>
        ))}
      </div>
      {architectureOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="architecture-title"
          onClick={() => setArchitectureOpen(false)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow mb-1">Architecture</div>
                <h2 id="architecture-title" className="section-title">
                  Production-style analytics flow
                </h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setArchitectureOpen(false)}
                aria-label="Close architecture dialog"
              >
                Close
              </button>
            </div>
            <pre className="architecture-modal-flow">{`Seeded Python generator
        |
        v
PostgreSQL star schema
        |
        v
Python validation checks
        |
        v
FastAPI endpoints
        |
        v
Next.js analytics report
        |
        v
VPS API deployment + Cloudflare frontend`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
