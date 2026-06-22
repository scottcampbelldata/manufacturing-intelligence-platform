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
  total_faults: number;
  production_hours: number;
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
export interface Oee {
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  oee_pct: number;
  line_hours: number;
  planned_units: number;
  produced_units: number;
  scrap_units: number;
  downtime_hours: number;
}
export interface OeeLine {
  line: string;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  oee_pct: number;
}
export interface StationLoss {
  station: string;
  station_name: string;
  downtime_hrs: number;
  faults: number;
  scrap_units: number;
  downtime_idx: number;
  scrap_idx: number;
  loss_index: number;
}
export interface ReplaceCandidate {
  asset_id: string;
  station: string;
  model: string;
  total_faults: number;
  faults_prior: number;
  faults_recent: number;
  avg_repair_min: number;
  downtime_hrs: number;
  trend: string;
}
export interface ValidationCheck {
  check_name: string;
  value: string;
  status: string;
}
export interface Provenance {
  source: string;
  no_proprietary_data: boolean;
  seed: number;
  reproducible: string;
  modeling: string[];
  oee_definition: string;
}

export const api = {
  kpi: () => get<Kpi>("/api/kpi"),
  oee: () => get<Oee>("/api/exec/oee"),
  oeeByLine: () => get<OeeLine[]>("/api/exec/oee/by-line"),
  lossByStation: () => get<StationLoss[]>("/api/exec/loss/by-station"),
  mttrByCrew: () => get<MttrCrew[]>("/api/shifts/mttr-by-crew"),
  handoff: () => get<Handoff[]>("/api/shifts/handoff"),
  rootCause: () => get<RootCause[]>("/api/quality/root-cause"),
  propagation: () => get<Propagation>("/api/quality/propagation"),
  yieldByQuarter: () => get<YieldQuarter[]>("/api/trends/yield-by-quarter"),
  summerThermal: () => get<SummerThermal[]>("/api/reliability/summer-thermal"),
  topAssets: () => get<TopAsset[]>("/api/reliability/top-assets?limit=10"),
  replaceCandidates: () =>
    get<ReplaceCandidate[]>("/api/reliability/replace-candidates?limit=10"),
  events: () => get<FactoryEvent[]>("/api/trends/events"),
  validation: () => get<ValidationCheck[]>("/api/methodology/validation"),
  provenance: () => get<Provenance>("/api/methodology/provenance"),
};
