// Chart palette — the single source of truth for data-viz colors, kept in sync
// with the CSS tokens in globals.css.
//
// Data language: STEEL is neutral/baseline data; SIGNAL (amber) marks the one
// thing the chart is actually saying — the worst crew, the top origin stations,
// an operational event. GOOD/DANGER are reserved for pass/fail and heat.
//
// Recharts sets `fill`/`stroke` as SVG presentation attributes, which do NOT
// resolve CSS var() — so chart colors must be literal hex chosen per theme.
// Components pick the right palette at render via useChartPalette() and repaint
// on toggle.
export type Theme = "light" | "dark";

export interface ChartPalette {
  ink: string;
  panel: string;
  panel2: string;
  edge: string;
  grid: string;
  text: string;
  mute: string;
  faint: string;
  steel: string;
  steelSoft: string;
  signal: string;
  signalSoft: string;
  good: string;
  danger: string;
  cursor: string; // tooltip hover band
  tooltipShadow: string;
}

// Dark — the original graphite control-room ground.
export const chartDark: ChartPalette = {
  ink: "#0C0F14",
  panel: "#141922",
  panel2: "#1A2029",
  edge: "#2A323D",
  grid: "#232B35",
  text: "#EAEEF4",
  mute: "#8F9CAD",
  faint: "#67727F",
  steel: "#6F8AAB",
  steelSoft: "#8AA0BC",
  signal: "#F2A93B",
  signalSoft: "#F7C476",
  good: "#4FB286",
  danger: "#E5544B",
  cursor: "rgba(148,163,191,0.10)",
  tooltipShadow: "0 12px 30px -12px rgba(0,0,0,0.8)",
};

// Light — "engineering paper": steel-blue data and a darkened amber so both
// read against a white card. Lines and dots use graphite ink.
export const chartLight: ChartPalette = {
  ink: "#1A1F26",
  panel: "#FFFFFF",
  panel2: "#F1EDE5",
  edge: "#DAD4C8",
  grid: "#E6E1D6",
  text: "#1A1F26",
  mute: "#50586A",
  faint: "#6B7280",
  steel: "#4E6E94",
  steelSoft: "#6E8BB0",
  signal: "#C77D1A",
  signalSoft: "#E0A23F",
  good: "#2F8F66",
  danger: "#C23B33",
  cursor: "rgba(26,31,38,0.05)",
  tooltipShadow: "0 12px 30px -16px rgba(26,31,38,0.30)",
};

export function getChart(theme: Theme): ChartPalette {
  return theme === "dark" ? chartDark : chartLight;
}

// Year-over-year thermal severity ramp (cool -> warm -> hot).
export function thermalRamp(c: ChartPalette): string[] {
  return [c.steel, c.signal, c.danger];
}

export const MONO = "var(--font-mono), ui-monospace, SFMono-Regular, monospace";

// Shared axis tick styling for Recharts (mono numerals read like instruments).
export function axisTick(c: ChartPalette) {
  return { fill: c.mute, fontSize: 12, fontFamily: MONO };
}
