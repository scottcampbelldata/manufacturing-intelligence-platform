import "@testing-library/jest-dom/vitest";

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom lacks.
// A no-op stub lets the report render (charts collapse to 0x0, which is fine
// for a smoke test).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverStub;

