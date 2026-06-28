import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the API client so the report renders against in-memory data (no network).
vi.mock("@/lib/api", () => {
  const api = {
    kpi: async () => ({
      line_hours: 78912,
      total_produced: 35264916,
      total_scrap: 725519,
      yield_pct: 97.94,
      total_downtime_min: 333749.5,
      total_planned: 38236302,
      total_faults: 8088,
      production_hours: 26304,
    }),
    oee: async () => ({
      availability_pct: 93.0,
      performance_pct: 99.2,
      quality_pct: 97.9,
      oee_pct: 90.3,
      line_hours: 78912,
      planned_units: 38236302,
      produced_units: 35264916,
      scrap_units: 725519,
      downtime_hours: 5562,
    }),
    oeeByLine: async () => [
      { line: "L1", availability_pct: 93, performance_pct: 99, quality_pct: 98, oee_pct: 90 },
    ],
    lossByStation: async () => [
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
    mttrByCrew: async () => [
      { crew: "A", faults: 1978, mttr_min: 37, total_downtime_hrs: 1220 },
      { crew: "D", faults: 2061, mttr_min: 48.2, total_downtime_hrs: 1656 },
    ],
    handoff: async () => [
      { shift_type: "night", time_window: "night_handoff_window", faults: 100, mttr_min: 55 },
    ],
    rootCause: async () => [
      { root_cause_station: "ST04", station_name: "Paint", defects_caused: 160510, pct_of_all: 22.12 },
    ],
    propagation: async () => ({ pct_detected_downstream: 69.36, total_defects: 725519 }),
    yieldByQuarter: async () => [{ qtr: "2024-01-01", avg_yield: 97.9, avg_planned: 460 }],
    summerThermal: async () => [{ yr: 2025, thermal_faults: 328 }],
    replaceCandidates: async () => [
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
    events: async () => [
      { event_date: "2024-04-15", end_date: null, category: "process_change", detail: "Weld retool" },
    ],
    validation: async () => [
      { check_name: "orphan faults (asset FK)", value: "0", status: "pass" },
    ],
    provenance: async () => ({
      source: "Synthetic, seeded.",
      no_proprietary_data: true,
      seed: 1970,
      reproducible: "yes",
      modeling: ["Weibull failures"],
      oee_definition: "OEE = A x P x Q",
    }),
  };
  return { api };
});

import Report from "./page";

describe("Report page", () => {
  it("renders the headline once data resolves", async () => {
    render(<Report />);
    expect(
      await screen.findByText("Automotive Assembly Intelligence")
    ).toBeInTheDocument();
    // A data-driven section rendered (proves the fetch->state->render path).
    expect(await screen.findByText("Where output is lost")).toBeInTheDocument();
  });
});
