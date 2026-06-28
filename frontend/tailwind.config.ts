import type { Config } from "tailwindcss";

// Colors reference the CSS custom properties in globals.css so there is a single
// source of truth for the palette (no more divergence between CSS and Tailwind).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        edge: "var(--edge)",
        "edge-soft": "var(--edge-soft)",
        ink: "var(--ink)",
        text: "var(--text)",
        strong: "var(--strong)",
        mute: "var(--mute)",
        faint: "var(--faint)",
        steel: "var(--steel)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        good: "var(--good)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
