import { SiteBar } from "@/components/SiteFrame";
import { ReportBand, CASE_STUDY, REPO } from "@/components/ReportBand";

// Lightweight loading placeholders shown while the report data is in flight.
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-mute/25 ${className}`}
      aria-hidden="true"
    />
  );
}

// Only the body changes while loading, so the title band keeps its node and paints once.
export function ReportSkeletonMain() {
  return (
      <main
        className="max-w-[1120px] mx-auto px-6 pt-10 space-y-10"
        aria-busy="true"
        aria-label="Loading report"
      >
        <p className="text-mute text-sm">Loading report</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBar key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBar className="h-64" />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonBar className="h-64" />
          <SkeletonBar className="h-64" />
        </div>
      </main>
  );
}

export function ReportSkeleton() {
  return (
    <>
      <SiteBar caseStudy={CASE_STUDY} repo={REPO} />
      <ReportBand />
      <ReportSkeletonMain />
    </>
  );
}
