import { describe, expect, it } from "vitest";

import { crewGap, risingCount, top3Pct, topLoss } from "./derive";
import { MttrCrew, ReplaceCandidate, RootCause, StationLoss } from "./api";

const mttr = (crew: string, mttr_min: number): MttrCrew => ({
  crew,
  mttr_min,
  faults: 1,
  total_downtime_hrs: 1,
});

describe("crewGap", () => {
  it("returns the percent the worst crew exceeds the best", () => {
    expect(crewGap([mttr("A", 40), mttr("D", 52)])).toBe(30);
  });

  it("is order-independent", () => {
    expect(crewGap([mttr("D", 52), mttr("A", 40)])).toBe(30);
  });

  it("returns 0 for empty input", () => {
    expect(crewGap([])).toBe(0);
  });
});

describe("top3Pct", () => {
  it("sums the first three percentages, rounded", () => {
    const rows = [
      { pct_of_all: 30 },
      { pct_of_all: 20 },
      { pct_of_all: 13 },
      { pct_of_all: 5 },
    ] as RootCause[];
    expect(top3Pct(rows)).toBe("63");
  });
});

describe("risingCount", () => {
  it("counts only rising trends", () => {
    const rows = [
      { trend: "rising" },
      { trend: "stable" },
      { trend: "rising" },
    ] as ReplaceCandidate[];
    expect(risingCount(rows)).toBe(2);
  });
});

describe("topLoss", () => {
  it("returns the first (pre-ranked) row", () => {
    const rows = [{ station: "ST06" }, { station: "ST04" }] as StationLoss[];
    expect(topLoss(rows)?.station).toBe("ST06");
  });
});
