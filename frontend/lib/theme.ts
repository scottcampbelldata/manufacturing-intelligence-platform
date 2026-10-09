// Chart palette - the single source of truth for data-viz colors, kept in sync
// with the CSS tokens in globals.css.
//
// Data language: STEEL is neutral/baseline data; SIGNAL (amber) marks the one
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

// Dark - the original graphite control-room ground.
export const chartDark: ChartPalette = {
  ink: "#11171A",
  panel: "#182126",
  panel2: "#202A30",
  edge: "#314049",
  grid: "#27343B",
  text: "#EAF0F2",
  mute: "#A2B0B6",
  faint: "#73838A",
  steel: "#78919E",
  steelSoft: "#9BB6C5",
  signal: "#D4A15D",
  signalSoft: "#E4C58F",
  good: "#6FBE92",
  danger: "#E2847E",
  cursor: "rgba(155,182,197,0.10)",
  tooltipShadow: "0 12px 30px -12px rgba(0,0,0,0.8)",
};

// Light - "engineering paper": steel-blue data and a darkened amber so both
// read against a white card. Lines and dots use graphite ink.
export const chartLight: ChartPalette = {
  ink: "#182329",
  panel: "#FCFDFD",
  panel2: "#E6EAEC",
  edge: "#CBD3D7",
  grid: "#DEE3E6",
  text: "#182329",
  mute: "#4F6068",
  faint: "#738087",
  steel: "#657782",
  steelSoft: "#8798A2",
  signal: "#A66413",
  signalSoft: "#C58B45",
  good: "#2F7A5B",
  danger: "#A43D39",
  cursor: "rgba(64,90,107,0.06)",
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
