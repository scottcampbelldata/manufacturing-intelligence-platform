// Chart palette - the single source of truth for data-viz colors, kept in sync
// with the CSS tokens in globals.css.
//
// Data language: STEEL is neutral/baseline data; SIGNAL (the slate accent) marks the one
// thing the chart is actually saying - the worst crew, the top origin stations,
// an operational event. GOOD/DANGER are reserved for pass/fail and heat.
//
// Recharts sets `fill`/`stroke` as SVG presentation attributes, which do NOT
// resolve CSS var() - so chart colors must be literal hex chosen per theme.
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

// Dark - the scottcampbell.io dark paper.
export const chartDark: ChartPalette = {
  ink: "#13191B",
  panel: "#182023",
  panel2: "#1A2326",
  edge: "#2B3539",
  grid: "#242D31",
  text: "#E6ECEE",
  mute: "#A6B4B9",
  faint: "#8E9DA3",
  steel: "#5F7F8A",
  steelSoft: "#86A3AD",
  signal: "#8CC1D6",
  signalSoft: "#B1D6E4",
  good: "#7CC29C",
  danger: "#E28D85",
  cursor: "rgba(140,193,214,0.10)",
  tooltipShadow: "none",
};

// Light - the scottcampbell.io preprint palette: slate accent marks the one
// thing the chart is saying, a grey blue carries the baseline.
export const chartLight: ChartPalette = {
  ink: "#1B2A30",
  panel: "#FFFFFF",
  panel2: "#EEF3F4",
  edge: "#D9DFE0",
  grid: "#E6EAEB",
  text: "#1B2A30",
  mute: "#4D5D63",
  faint: "#5F6E74",
  steel: "#9FB6BE",
  steelSoft: "#B9CCD2",
  signal: "#28566B",
  signalSoft: "#7F9EA9",
  good: "#2F6B4F",
  danger: "#8E2B22",
  cursor: "rgba(40,86,107,0.06)",
  tooltipShadow: "none",
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
