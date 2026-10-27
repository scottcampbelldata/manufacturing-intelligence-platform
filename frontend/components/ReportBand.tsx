import { ThemeToggle } from "@/components/ThemeToggle";

export const CASE_STUDY = "https://scottcampbell.io/projects/manufacturing-intelligence-platform/";
export const REPO = "https://github.com/scottcampbelldata/manufacturing-intelligence-platform";

// Title band and summary aside, as on the scottcampbell.io project pages.
export function ReportBand() {
  return (
    <div className="report-band">
      <div className="report-band-inner">
        <div>
          <div className="report-kicker">Operations analytics report</div>
          <h1>Automotive Assembly Intelligence</h1>
          <p className="report-lead">
            Three years of synthetic assembly-line data modeled through a
            production-style analytics pipeline. The report identifies output
            loss, quality escapes, repair gaps, trend shifts, and replacement
            priorities.
          </p>
          <div className="report-tools">
            <span className="badge">
              <span className="badge-dot" /> Synthetic, seeded, no proprietary data
            </span>
            <ThemeToggle />
          </div>
        </div>
        <dl className="glance" aria-label="Report summary">
          <dt>The question</dt>
          <dd>Where is an assembly plant losing output, and what should be fixed first?</dd>
          <dt>The data</dt>
          <dd>A seeded synthetic factory dataset in a PostgreSQL star schema, checked for row counts, keys, nulls and yield reconciliation.</dd>
          <dt>The read</dt>
          <dd>Each section ends with the decision it supports. <a href={CASE_STUDY}>Read the case study</a>.</dd>
        </dl>
      </div>
    </div>
  );
}
