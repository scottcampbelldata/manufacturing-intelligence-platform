import { ThemeToggle } from "@/components/ThemeToggle";

// Lightweight loading placeholders shown while the report data is in flight.
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-mute/25 ${className}`}
      aria-hidden="true"
    />
  );
}

export function ReportSkeleton() {
  return (
    <main
      className="max-w-6xl mx-auto p-6 md:p-8 space-y-7"
      aria-busy="true"
      aria-label="Loading report"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <div className="eyebrow mb-1">Operations Analytics Report</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-strong tracking-tight">
            Automotive Assembly Intelligence
          </h1>
          <p className="text-mute text-sm mt-2">Loading report</p>
        </div>
        <ThemeToggle />
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
