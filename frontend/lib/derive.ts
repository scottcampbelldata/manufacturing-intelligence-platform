// Pure functions for the headline figures shown on the report. Extracted from
// the page component so they can be unit-tested without rendering.
import { MttrCrew, ReplaceCandidate, RootCause, StationLoss } from "./api";

/** Percent by which the slowest crew's MTTR exceeds the fastest crew's. */
export function crewGap(mttr: MttrCrew[]): number {
  if (mttr.length === 0) return 0;
  const sorted = [...mttr].sort((a, b) => a.mttr_min - b.mttr_min);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (!best.mttr_min) return 0;
  return Math.round((100 * (worst.mttr_min - best.mttr_min)) / best.mttr_min);
}

/** The single largest combined-loss station (rows arrive pre-ranked). */
export function topLoss(loss: StationLoss[]): StationLoss | undefined {
  return loss[0];
}

/** Share of all scrap created by the top three root-cause stations, rounded. */
export function top3Pct(rootCause: RootCause[]): string {
  return rootCause
    .slice(0, 3)
    .reduce((s, r) => s + r.pct_of_all, 0)
    .toFixed(0);
}

/** How many replacement candidates have a rising year-over-year fault trend. */
export function risingCount(candidates: ReplaceCandidate[]): number {
  return candidates.filter((c) => c.trend === "rising").length;
}
