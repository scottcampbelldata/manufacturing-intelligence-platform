// Lightweight loading placeholders shown while the report data is in flight.
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-edge/60 ${className}`}
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
      <div className="space-y-3">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="h-8 w-2/3" />
        <SkeletonBar className="h-4 w-full max-w-3xl" />
      </div>
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
