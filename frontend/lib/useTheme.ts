"use client";

// Theme state is owned by the `data-theme` attribute on <html> (set before
// paint by the inline script in layout.tsx, default "light"). This hook mirrors
// that attribute into React and lets components toggle + persist it.
import { useEffect, useState } from "react";
import { chartDark, chartLight, type Theme, type ChartPalette } from "./theme";

const STORAGE_KEY = "theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  // Start "light" so SSR/first paint match the default; reconcile on mount.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode / storage disabled — the in-page toggle still works.
    }
  };

  return { theme, toggle };
}

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === "dark" ? chartDark : chartLight;
}
