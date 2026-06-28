# Senior-Level Overhaul — Design Spec

**Date:** 2026-06-27
**Author:** Scott Campbell (with Claude)
**Status:** Approved scope, pending spec review

## Context

The Automotive Assembly Intelligence Platform is a portfolio data-engineering
project: a seeded synthetic generator → PostgreSQL star schema → analytical SQL
views → FastAPI → static Next.js report, deployed live (Cloudflare Pages +
VPS). It is already well-built (real CI against Postgres, clean star schema,
deterministic generator, good README). This overhaul closes the gaps a senior
reviewer or hiring manager would flag — it is **not** a rewrite.

### Goals (from scoping)

- **Purpose:** portfolio / job-hunting piece. Optimize for reviewer-facing
  clarity, correctness, and analytical credibility over production infra.
- **Scope:** comprehensive overhaul across backend, data model, generator,
  frontend, tests, and DX — sequenced into reviewable commits.
- **Contracts:** free to change API contracts and behavior, provided the live
  frontend is updated in lockstep so nothing breaks for visitors.
- **Dataset:** **regenerate and update everywhere.** Remove generator dead code,
  regenerate the seeded dataset, and update every quoted number (README,
  INSIGHTS, tests, live deploy) in one consistent pass.

### Non-goals

- No auth, multi-tenancy, real-time ingestion, or migration framework
  (acknowledged in README "Known limitations"; schema-reload model stays).
- No new analytics "stories" beyond what exists — depth and correctness of the
  current narrative, not new sections.
- No change to the deployment topology (Cloudflare Pages + VPS + nginx +
  systemd stays).

## Current-state findings

Concrete issues identified during code read:

1. **Dishonest health check.** `system_payload()` in `backend/app/main.py`
   hardcodes `"database": "connected"`, `"db": True`, `schema_version`, and
   `dataset_seed` regardless of actual DB state. A health check that cannot
   fail. `/health` and `/api/system` are byte-identical.
2. **Untyped API.** No Pydantic response models; `/docs` shows empty `{}`
   schemas. Endpoints return raw dicts from `db.fetch_all/one`.
3. **No caching.** Static 3-year dataset, but `fetch` uses `cache: "no-store"`
   and every load re-queries Postgres. No `Cache-Control` headers.
4. **Placeholder proof endpoint.** `methodology/views` returns literal `"..."`
   strings as "the SQL logic" — on an endpoint whose entire purpose is proof.
5. **No `dim_station`.** `root_cause_station` / `detected_station` are free
   `TEXT` with no FK, in a project that markets referential integrity. Station
   names are duplicated in `backend/app/routers/exec.py` and the generator.
6. **Generator hygiene.** One 650-line script; hardcoded `SEED`/paths (no CLI);
   dead code at lines ~390–392 (`if rng.random() < ...: pass`); no type hints;
   pure helper functions have zero unit tests.
7. **Frontend robustness.** Single 274-line client component; derived metrics
   (`crewGap`, `topLoss`, `top3`, `risingCount`) computed inline and untested;
   one global error string, no per-load skeletons; no tests at all.
8. **Test/CI gaps.** Every test requires a live Postgres; no fast unit tests; no
   frontend tests; no linter; no typecheck step in CI.
9. **DX.** No one-command local run; reviewers must hand-install Postgres.

## Architecture (unchanged, with additions)

```
generator (CLI, +dim_station) → CSVs → PostgreSQL star schema (+dim_station, FKs)
  → analytical SQL views → FastAPI (typed, cached, honest health) → Next.js report
```

New supporting pieces: `docker-compose.yml` (local Postgres), `Makefile` (task
runner), `pyproject.toml` (ruff + pytest config), frontend test tooling
(Vitest + RTL).

## Workstreams

Each workstream is an independently reviewable unit. Order is chosen so the
dataset is regenerated once (Workstream C) before numbers are recomputed and
propagated (Workstream G).

### A. Backend correctness & typed contracts

- `backend/app/schemas.py`: Pydantic models mirroring every endpoint's shape
  (Kpi, Oee, OeeLine, StationLoss, MttrCrew, Handoff, RootCause, Propagation,
  YieldQuarter, SummerThermal, ReplaceCandidate, FactoryEvent, ValidationCheck,
  Provenance, SystemStatus, etc.). Attach via `response_model=`.
- Honest health: wrap the system query in try/except. `system_payload()`
  reports `database: "connected" | "error"` truthfully. Add `/health` (liveness,
  no DB, always 200 if process up) and keep `/api/system` + add `/health/ready`
  (runs the query; 503 + `database: "error"` on failure). Move
  `schema_version` / `dataset_seed` into `config.py` constants.
- Dependency-free async TTL cache (`backend/app/cache.py`): a small decorator
  keyed by endpoint; long TTL (data static between reloads). Add
  `Cache-Control: public, max-age=...` headers to data endpoints.
- Structured logging (`logging` config) + a global exception handler returning
  `{"error": ...}` JSON with a 500 and a logged traceback.
- `methodology/views`: replace `"..."` with real definitions pulled via
  `SELECT pg_get_viewdef('v_name', true)` for each backing view.

### B. Data model & SQL

- `dim_station` table: `station_id PK, station_name, station_order,
  station_type CHECK (process|inspection)`. Add to `db/schema.sql` (created
  first), `db/load_data.py` LOAD_ORDER (loaded first), and TRUNCATE list.
- Add FKs: `fact_defect_events.root_cause_station` and `.detected_station` →
  `dim_station(station_id)`; `dim_asset.station`, `fact_fault_events.station`,
  `fact_production` stays line-grained (no station col). Verify load order.
- Replace `exec.py` `STATION_NAMES` dict with a join to `dim_station` in
  `v_loss_by_station` (and surface `station_name` from SQL).
- New `v_validation` checks: orphan defect stations (root + detected) against
  `dim_station`.

### C. Generator quality (regenerate)

- `argparse` CLI: `--seed` (default 1970), `--out` (default `output`),
  `--days` (default 1095). Reproducibility preserved at defaults.
- Remove dead code (lines ~390–392). **This changes the RNG stream → dataset
  regenerated.** Accepted per decision.
- Type hints on all functions; emit `dim_station.csv`.
- Make pure helpers importable and unit-tested (no DB): `summer_signal`,
  `season_severity`, `seasonal_fault_factor`, `ci_factor`, `demand_factor`,
  `process_defect_mult`, `new_product_defect_mult`, `acute_*`.

### D. Frontend robustness & tests

- Extract derived-metric logic from `page.tsx` into `frontend/lib/derive.ts`
  (pure functions: `crewGap`, `topLoss`, `top3Pct`, `risingCount`) and unit-test
  them.
- Per-load loading skeletons + a typed, friendlier error state. Keep single-page
  report and `output: "export"`.
- Vitest + React Testing Library: transform unit tests + a render smoke test
  (mock `api`). Add `test` and `typecheck` (`tsc --noEmit`) npm scripts.

### E. Testing & CI depth

- Split CI into:
  - **unit** job (no Postgres): generator helper tests + `ruff` + frontend
    Vitest + `tsc --noEmit`. Fast, runs on every push.
  - **integration** job (existing Postgres service): full pipeline + API
    contract + validation tests.
- Add `pyproject.toml`: `ruff` config + `pytest` config (testpaths, markers for
  `db`-requiring tests so unit tests run standalone).
- Pin count-assertion test to the **regenerated** numbers.

### F. Docs & DX

- `docker-compose.yml`: Postgres 16 for local dev (matches CI image).
- `Makefile` (or `tasks.ps1` companion): `generate`, `load`, `views`, `db-up`,
  `test`, `lint`, `demo` (end-to-end local bring-up).
- README updates: new endpoints (`/health`, `/health/ready`), generator CLI,
  `docker compose` quickstart, lint/test commands, `dim_station` in schema docs
  (`docs/schema.md`).

### G. Recompute & propagate published numbers

- Run the full pipeline (regenerated CSVs → docker Postgres → views) and capture
  the new authoritative numbers: row counts, OEE breakdown, yield, MTTR crew
  gap %, % detected downstream, top-3 root-cause %, event step-change %s,
  thermal/summer figures.
- Update every quoted figure consistently: `README.md`, `INSIGHTS.md`,
  `tests/test_api_contracts.py` (the `726793` assertion etc.),
  `backend/app/main.py`/config constants, and any frontend copy with literals.
- Redeploy is the user's manual step (documented), but repo numbers must all
  match the regenerated dataset.

## Testing strategy

- **Unit (no DB, fast):** generator pure helpers; frontend derive functions;
  frontend render smoke test.
- **Integration (Postgres):** regenerate → load → views → API contracts →
  validation endpoint PASS → `/docs` & `/openapi.json` available → new
  `dim_station` orphan checks.
- **Determinism guard:** a test asserting the seeded generator reproduces the
  committed row counts (pins the regenerated values).
- All new endpoints get contract assertions; honest-health behavior tested by
  asserting `/health` is DB-independent and readiness reflects DB state.

## Risks & mitigations

- **Regeneration drift:** numbers appear in many files. Mitigation: Workstream G
  is a single dedicated pass with a checklist of every file holding a literal;
  the determinism guard test prevents silent future drift.
- **Recompute needs Postgres locally:** the new `docker-compose` provides it;
  if Docker is unavailable, fall back to an existing local Postgres via
  `DATABASE_URL`.
- **Live frontend breakage from contract changes:** every backend shape change
  is paired with a frontend update in the same workstream; CI `tsc --noEmit`
  catches mismatches; the API stays additive where possible.
- **FK additions failing load:** load `dim_station` first; validate FK targets
  exist for all station codes the generator emits.

## Out of scope / explicitly deferred

- Migrations, auth, retention, Redis, real-time, container deploy of the API.
- New analytical narratives or chart types.
- Changing hosting/deploy topology.
```
