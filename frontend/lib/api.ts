// Typed API client for the FastAPI backend.
// Set NEXT_PUBLIC_API_BASE in the environment (e.g. https://factory-api.scottcampbell.io).
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Kpi {
  line_hours: number;
  total_produced: number;
  total_scrap: number;
  yield_pct: number;
  total_downtime_min: number;
}
export interface MttrCrew {
  crew: string;
  faults: number;
  mttr_min: number;
  total_downtime_hrs: number;
}
export interface Handoff {
  shift_type: string;
  time_window: string;
  faults: number;
  mttr_min: number;
}
export interface RootCause {
  root_cause_station: string;
  station_name: string;
  defects_caused: number;
  pct_of_all: number;
}
export interface Propagation {
  pct_detected_downstream: number;
  total_defects: number;
}
export interface YieldQuarter {
  qtr: string;
  avg_yield: number;
  avg_planned: number;
}
export interface SummerThermal {
  yr: number;
  thermal_faults: number;
}
export interface TopAsset {
  asset_id: string;
  asset_class: string;
  station: string;
  faults: number;
  avg_repair_min: number;
}
export interface FactoryEvent {
  event_date: string;
  end_date: string | null;
  category: string;
  detail: string;
}

export const api = {
  kpi: () => get<Kpi>("/api/kpi"),
  mttrByCrew: () => get<MttrCrew[]>("/api/shifts/mttr-by-crew"),
  handoff: () => get<Handoff[]>("/api/shifts/handoff"),
  rootCause: () => get<RootCause[]>("/api/quality/root-cause"),
  propagation: () => get<Propagation>("/api/quality/propagation"),
  yieldByQuarter: () => get<YieldQuarter[]>("/api/trends/yield-by-quarter"),
  summerThermal: () => get<SummerThermal[]>("/api/reliability/summer-thermal"),
  topAssets: () => get<TopAsset[]>("/api/reliability/top-assets?limit=10"),
  events: () => get<FactoryEvent[]>("/api/trends/events"),
};
