// Chart palette — the single source of truth for data-viz colors, kept in sync
// with the CSS tokens in globals.css.
//
// Data language: STEEL is neutral/baseline data; SIGNAL (amber) marks the one
// thing the chart is actually saying — the worst crew, the top origin stations,
// an operational event. GOOD/DANGER are reserved for pass/fail and heat.
export const chart = {
  ink: "#0C0F14",
  panel: "#141922",
  panel2: "#1A2029",
  edge: "#2A323D",
  grid: "#232B35",
  text: "#EAEEF4",
  mute: "#8F9CAD",
  faint: "#67727F",
  steel: "#6F8AAB", // baseline data
  steelSoft: "#8AA0BC",
  signal: "#F2A93B", // the insight / attention
  signalSoft: "#F7C476",
  good: "#4FB286", // pass / healthy
  danger: "#E5544B", // fail / hottest
} as const;

// Year-over-year thermal severity ramp (cool -> warm -> hot).
export const thermalRamp = [chart.steel, chart.signal, chart.danger];

export const MONO = "var(--font-mono), ui-monospace, SFMono-Regular, monospace";

// Shared axis tick styling for Recharts (mono numerals read like instruments).
export const axisTick = { fill: chart.mute, fontSize: 12, fontFamily: MONO };
