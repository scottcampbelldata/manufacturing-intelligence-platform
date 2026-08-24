import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  kpi: vi.fn(),
  oee: vi.fn(),
  oeeByLine: vi.fn(),
  lossByStation: vi.fn(),
  mttrByCrew: vi.fn(),
  handoff: vi.fn(),
  rootCause: vi.fn(),
  propagation: vi.fn(),
  yieldByQuarter: vi.fn(),
  summerThermal: vi.fn(),
  replaceCandidates: vi.fn(),
  events: vi.fn(),
  validation: vi.fn(),
  provenance: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMocks,
}));

import Report from "./page";

const resolved = {
  kpi: {
    line_hours: 78912,
    total_produced: 35264916,
    total_scrap: 725519,
    yield_pct: 97.94,
    total_downtime_min: 333749.5,
    total_planned: 38236302,
    total_faults: 8088,
    production_hours: 26304,
  },
  oee: {
    availability_pct: 93.0,
    performance_pct: 99.2,
    quality_pct: 97.9,
    oee_pct: 90.3,
    line_hours: 78912,
    planned_units: 38236302,
    produced_units: 35264916,
    scrap_units: 725519,
    downtime_hours: 5562,
  },
  oeeByLine: [
    { line: "L1", availability_pct: 93, performance_pct: 99, quality_pct: 98, oee_pct: 90 },
  ],
  lossByStation: [
    {
      station: "ST06",
      station_name: "Final Assembly",
      downtime_hrs: 900,
      faults: 1200,
      scrap_units: 150319,
      downtime_idx: 96,
      scrap_idx: 94,
      loss_index: 190,
    },
  ],
  mttrByCrew: [
    { crew: "A", faults: 1978, mttr_min: 37, total_downtime_hrs: 1220 },
    { crew: "D", faults: 2061, mttr_min: 48.2, total_downtime_hrs: 1656 },
  ],
  handoff: [
    { shift_type: "night", time_window: "night_handoff_window", faults: 100, mttr_min: 55 },
  ],
  rootCause: [
    { root_cause_station: "ST04", station_name: "Paint", defects_caused: 160510, pct_of_all: 22.12 },
  ],
  propagation: { pct_detected_downstream: 69.36, total_defects: 725519 },
  yieldByQuarter: [{ qtr: "2024-01-01", avg_yield: 97.9, avg_planned: 460 }],
  summerThermal: [{ yr: 2025, thermal_faults: 328 }],
  replaceCandidates: [
    {
      asset_id: "ROB-001",
      station: "ST03",
      model: "FANUC-R2000iC",
      total_faults: 40,
      faults_prior: 15,
      faults_recent: 25,
      avg_repair_min: 38,
      downtime_hrs: 25,
      trend: "rising",
    },
  ],
  events: [
    { event_date: "2024-04-15", end_date: null, category: "process_change", detail: "Weld retool" },
  ],
  validation: [
    { check_name: "orphan faults (asset FK)", value: "0", status: "pass" },
  ],
  provenance: {
    source: "Synthetic, seeded.",
    no_proprietary_data: true,
    seed: 1970,
    reproducible: "yes",
    modeling: ["Weibull failures"],
    oee_definition: "OEE = A x P x Q",
  },
};

function mockResolved() {
  apiMocks.kpi.mockResolvedValue(resolved.kpi);
  apiMocks.oee.mockResolvedValue(resolved.oee);
  apiMocks.oeeByLine.mockResolvedValue(resolved.oeeByLine);
  apiMocks.lossByStation.mockResolvedValue(resolved.lossByStation);
  apiMocks.mttrByCrew.mockResolvedValue(resolved.mttrByCrew);
  apiMocks.handoff.mockResolvedValue(resolved.handoff);
  apiMocks.rootCause.mockResolvedValue(resolved.rootCause);
  apiMocks.propagation.mockResolvedValue(resolved.propagation);
  apiMocks.yieldByQuarter.mockResolvedValue(resolved.yieldByQuarter);
  apiMocks.summerThermal.mockResolvedValue(resolved.summerThermal);
  apiMocks.replaceCandidates.mockResolvedValue(resolved.replaceCandidates);
  apiMocks.events.mockResolvedValue(resolved.events);
  apiMocks.validation.mockResolvedValue(resolved.validation);
  apiMocks.provenance.mockResolvedValue(resolved.provenance);
}

function holdAllUnresolved() {
  // Never-settling promises so first paint stays on the skeleton.
  for (const fn of Object.values(apiMocks)) {
    fn.mockReturnValue(new Promise(() => {}));
  }
}

beforeEach(() => {
  for (const fn of Object.values(apiMocks)) {
    fn.mockReset();
  }
  mockResolved();
});

describe("Report page", () => {
  it("keeps report chrome visible while the 14 fetches are in flight", () => {
    holdAllUnresolved();
    render(<Report />);

    expect(screen.getByText("Operations Analytics Report")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Automotive Assembly Intelligence" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch to dark theme" })
    ).toBeInTheDocument();
    const skeleton = screen.getByRole("main", { name: "Loading report" });
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("renders the headline once data resolves", async () => {
    render(<Report />);
    // Wait on a loaded-only section: the skeleton now also shows the headline.
    expect(await screen.findByText("Where output is lost")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Automotive Assembly Intelligence" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Three years of synthetic assembly-line data/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic - seeded - no proprietary data/)
    ).toBeInTheDocument();
  });

  it("shows the connection error when a fetch rejects", async () => {
    apiMocks.kpi.mockRejectedValue(new Error("API /kpi -> 500"));
    render(<Report />);
    expect(await screen.findByText("Couldn't load the report")).toBeInTheDocument();
  });
});
