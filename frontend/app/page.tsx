export default function Dashboard() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-2xl border border-edge bg-panel rounded-lg p-6 md:p-8">
        <p className="text-xs uppercase tracking-wider text-accent">Rebuild in progress</p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-white">
          Manufacturing Intelligence Platform
        </h1>
        <p className="mt-4 text-mute leading-7">
          This case study is temporarily offline while the dataset, database
          schema, API, and dashboard are rebuilt around a new approved synthetic
          manufacturing scenario.
        </p>
        <p className="mt-4 text-sm text-mute">
          The public API is also in maintenance mode until the replacement data
          model is loaded.
        </p>
      </section>
    </main>
  );
}
