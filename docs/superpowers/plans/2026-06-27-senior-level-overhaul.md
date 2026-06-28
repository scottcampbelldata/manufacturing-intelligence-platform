# Senior-Level Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Automotive Assembly Intelligence Platform to senior level — typed/honest/cached backend, a real `dim_station` dimension, a CLI-driven and unit-tested generator, a tested and robust frontend, deeper CI, one-command DX, and a clean dataset regeneration with all published numbers propagated.

**Architecture:** Same pipeline (generator → CSVs → PostgreSQL star schema → analytical SQL views → FastAPI → static Next.js). Additions: `dim_station` dimension with FKs; Pydantic response models + TTL cache + structured logging on the API; pure-function extraction + tests on both generator and frontend; split CI (fast unit job + Postgres integration job); `docker-compose`, `Makefile`, `pyproject.toml` for DX.

**Tech Stack:** Python 3.12, FastAPI, asyncpg, pandas/numpy, PostgreSQL 16, Next.js 14 (static export), TypeScript, Recharts, Vitest + React Testing Library, ruff, pytest, GitHub Actions.

## Global Constraints

- Default generator seed is `1970`; `--seed` defaults to it so reproducibility holds at defaults.
- Live frontend must keep working: any backend response-shape change is paired with a frontend update in the same task.
- No new runtime dependencies on the API beyond the standard library for caching/logging (no Redis). Pydantic ships with FastAPI.
- Dataset is **regenerated**: dead code removed, every quoted number re-derived and propagated across `README.md`, `INSIGHTS.md`, tests, backend constants, and frontend copy.
- Postgres for local recompute: project ships `docker-compose.yml` (Postgres 16) as the documented path; this machine uses a no-admin PostgreSQL 16 binaries install at `C:\Users\ScottCampbell\tools\pgsql` on port 5433, db `manufacturing`.
- Station codes are exactly ST01–ST08; `dim_station` must cover all of them.
- No auth, migrations, retention, or deploy-topology changes (out of scope).

---

## Local recompute environment (prerequisite, one-time)

- [ ] Verify the downloaded PostgreSQL 16 binaries zip extracted to `C:\Users\ScottCampbell\tools\pgsql\pgsql`.
- [ ] `initdb` a data dir at `C:\Users\ScottCampbell\tools\pgsql\data` (trust auth, UTF8).
- [ ] Start postgres on port 5433; create database `manufacturing`.
- [ ] Export `DATABASE_URL=postgresql://postgres@localhost:5433/manufacturing` for all subsequent recompute/test commands.

---

## Task 1: DX foundation — pyproject, ruff config, docker-compose, Makefile

**Files:**
- Create: `pyproject.toml`
- Create: `docker-compose.yml`
- Create: `Makefile`
- Create: `tasks.ps1` (Windows companion for the Make targets)

**Interfaces:**
- Produces: `ruff` + `pytest` config (testpaths=`tests`, marker `db`); Make/PS targets `db-up`, `generate`, `load`, `views`, `test`, `lint`, `demo`.

- [ ] **Step 1:** Write `pyproject.toml`:

```toml
[project]
name = "manufacturing-intelligence-platform"
version = "1.0.0"
requires-python = ">=3.12"

[tool.ruff]
line-length = 100
target-version = "py312"
extend-exclude = ["frontend", "*/output"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
ignore = ["E501"]  # long SQL strings/tables are intentional

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = [
    "db: test requires a live PostgreSQL (DATABASE_URL)",
]
```

- [ ] **Step 2:** Write `docker-compose.yml` (reviewer path; mirrors CI `postgres:16`):

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: manufacturing
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
```

- [ ] **Step 3:** Write `Makefile` with targets `db-up`, `generate`, `load`, `views`, `pipeline` (generate+load+views), `test`, `test-unit`, `lint`, `demo`. Use `DATABASE_URL ?= postgresql://postgres:postgres@localhost:5432/manufacturing`.
- [ ] **Step 4:** Write `tasks.ps1` mirroring the targets for Windows users.
- [ ] **Step 5:** `ruff check .` runs clean (fix any pre-existing lint in backend/db/generator at this step or `# noqa` with justification). Commit.

```bash
git add pyproject.toml docker-compose.yml Makefile tasks.ps1
git commit -m "chore: add pyproject (ruff/pytest), docker-compose, Makefile DX tooling"
```

---

## Task 2: `dim_station` dimension — schema + loader

**Files:**
- Modify: `db/schema.sql`
- Modify: `db/load_data.py`
- Modify: `docs/schema.md`

**Interfaces:**
- Produces: table `dim_station(station_id PK, station_name, station_order, station_type CHECK(process|inspection))`; loaded first in `load_data.py`.

- [ ] **Step 1:** In `db/schema.sql`, add `dim_station` to the `DROP TABLE` list and create it before `dim_asset`:

```sql
CREATE TABLE dim_station (
    station_id    TEXT PRIMARY KEY,
    station_name  TEXT NOT NULL,
    station_order INTEGER NOT NULL,
    station_type  TEXT NOT NULL CHECK (station_type IN ('process','inspection'))
);
```

- [ ] **Step 2:** Add FKs referencing `dim_station`: `dim_asset.station`, `fact_fault_events.station`, `fact_defect_events.root_cause_station`, `fact_defect_events.detected_station`. (Add `REFERENCES dim_station(station_id)` to those columns.)
- [ ] **Step 3:** In `db/load_data.py`, add `dim_station` as the first `LOAD_ORDER` entry (`station_id,station_name,station_order,station_type`) and to the `TRUNCATE` list.
- [ ] **Step 4:** Document `dim_station` in `docs/schema.md`.
- [ ] **Step 5:** Commit (cannot fully test until generator emits the CSV in Task 3 — this task + Task 3 verify together).

```bash
git add db/schema.sql db/load_data.py docs/schema.md
git commit -m "feat(db): add dim_station dimension with FKs from fact/dim tables"
```

---

## Task 3: Generator — CLI, type hints, dead-code removal, `dim_station.csv`, unit tests

**Files:**
- Modify: `generator/generate_factory_data.py`
- Create: `tests/test_generator_helpers.py`
- Modify: `tests/test_generator_reproducibility.py` (pin regenerated counts)

**Interfaces:**
- Consumes: nothing.
- Produces: importable pure helpers `summer_signal(ts)->float`, `season_severity(ts)->float`, `seasonal_fault_factor(ts)->float`, `ci_factor(ts)->float`, `demand_factor(ts)->float`, `process_defect_mult(ts,station)->float`, `new_product_defect_mult(ts,station)->float`; `build_stations()->DataFrame`; a `main(seed,out,days)` entrypoint; `dim_station.csv` output.

- [ ] **Step 1: Write failing helper tests** in `tests/test_generator_helpers.py` (no DB, no marker — runs in fast job):

```python
import sys, math
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "generator"))
import generate_factory_data as g

def test_summer_signal_peaks_midsummer():
    assert g.summer_signal(datetime(2024, 7, 19)) > 0.99
    assert g.summer_signal(datetime(2024, 1, 19)) < -0.99

def test_season_severity_uses_summer_table():
    assert g.season_severity(datetime(2025, 7, 15)) == g.SUMMER_SEVERITY[2025]

def test_process_defect_mult_steps_down_after_change():
    from datetime import datetime as dt
    before = g.process_defect_mult(dt(2024, 4, 14), "ST03")
    after = g.process_defect_mult(dt(2024, 4, 16), "ST03")
    assert before == 1.0 and after == 0.55

def test_build_stations_covers_all_eight():
    df = g.build_stations()
    assert set(df["station_id"]) == {f"ST0{i}" for i in range(1, 9)}
    assert set(df["station_type"]) == {"process", "inspection"}
```

- [ ] **Step 2:** Run `pytest tests/test_generator_helpers.py -q` → FAIL (no `build_stations`, module may run on import).
- [ ] **Step 3:** Refactor generator: guard the run block under `def main(seed=SEED, out="output", days=DAYS)` + `argparse` in `if __name__ == "__main__":` so importing the module does **not** execute generation. Add `build_stations()` returning the 8 stations (ST01–ST06 `process`, ST07–ST08 `inspection`, `station_order` = index). Add type hints to helpers. **Remove the dead `if rng.random() < (bonus - int(bonus)) + 0.0: pass` block** (accepted RNG-stream change). Emit `dim_station.csv` in the run block.
- [ ] **Step 4:** Run `pytest tests/test_generator_helpers.py -q` → PASS.
- [ ] **Step 5:** Regenerate dataset: `cd generator && python generate_factory_data.py`. Capture new row counts from stdout.
- [ ] **Step 6:** Update `tests/test_generator_reproducibility.py` to assert the **new** committed counts (row counts from the regenerated CSVs). Run it → PASS.
- [ ] **Step 7:** Commit.

```bash
git add generator/generate_factory_data.py tests/test_generator_helpers.py tests/test_generator_reproducibility.py
git commit -m "feat(generator): CLI + type hints + dim_station, drop dead code, unit tests"
```

---

## Task 4: Load regenerated data + recompute authoritative numbers

**Files:**
- Create: `docs/superpowers/numbers.md` (scratch capture of recomputed figures — not committed; working note)

**Interfaces:**
- Consumes: regenerated CSVs, `dim_station.csv`.
- Produces: a captured set of authoritative numbers for Task 9 propagation.

- [ ] **Step 1:** Apply schema: `psql "$DATABASE_URL" -f db/schema.sql`.
- [ ] **Step 2:** Load: `python db/load_data.py` (verify `dim_station` loads first, all FKs satisfied — if any FK fails, fix the generator station emission and re-run Task 3 Step 5).
- [ ] **Step 3:** Apply views: `psql "$DATABASE_URL" -f db/analytical_views.sql`.
- [ ] **Step 4:** Query and record: all `v_validation` rows; `v_kpi_overall`; `v_oee` (availability/performance/quality/oee + totals); `v_mttr_by_crew` (compute best-vs-worst gap %); `v_propagation` (pct downstream); top-3 `v_rootcause_ranking` sum; `v_summer_thermal`; the event step-changes (ST03 retool %, mechanical PM %). Save to the scratch note.
- [ ] **Step 5:** No commit (data/CSVs are gitignored; numbers captured for Task 9).

---

## Task 5: Backend — Pydantic response models + typed endpoints

**Files:**
- Create: `backend/app/schemas.py`
- Modify: `backend/app/routers/*.py` (add `response_model=`)
- Modify: `backend/app/config.py` (add `SCHEMA_VERSION`, `DATASET_SEED`)
- Modify: `tests/test_api_contracts.py` (assert typed OpenAPI components exist)

**Interfaces:**
- Produces: Pydantic models `Kpi, Oee, OeeLine, StationLoss, MttrCrew, Handoff, RootCause, Propagation, YieldQuarter, SummerThermal, ReplaceCandidate, TopAsset, FactoryEvent, ValidationCheck, Provenance, ViewLogic, SystemStatus`.

- [ ] **Step 1: Write failing test** in `tests/test_api_contracts.py`:

```python
def test_openapi_is_typed(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)
    from backend.app.main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        spec = client.get("/openapi.json").json()
        assert "Oee" in spec["components"]["schemas"]
        kpi_ref = spec["paths"]["/api/kpi"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
        assert "$ref" in kpi_ref  # not an empty {} schema
```

- [ ] **Step 2:** Run → FAIL (no components/schemas; refs absent).
- [ ] **Step 3:** Create `backend/app/schemas.py` with all models (fields mirror `frontend/lib/api.ts` exactly so the contract stays identical). Add `SCHEMA_VERSION="2026.06.27"` and `DATASET_SEED=1970` to `config.py`. Add `response_model=` to every router endpoint.
- [ ] **Step 4:** Run typed test + existing contract tests → PASS.
- [ ] **Step 5:** Commit.

```bash
git add backend/app/schemas.py backend/app/routers backend/app/config.py tests/test_api_contracts.py
git commit -m "feat(api): typed Pydantic response models on all endpoints"
```

---

## Task 6: Backend — honest health/readiness + structured logging + exception handler

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/db.py` (add `ping()` returning bool)
- Create: `backend/app/logging_config.py`
- Modify: `tests/test_api_contracts.py`

**Interfaces:**
- Consumes: `SCHEMA_VERSION`, `DATASET_SEED` from config.
- Produces: `/health` (liveness, no DB), `/health/ready` + `/api/system` (readiness, real DB state, 503 on failure); `db.ping()->bool`.

- [ ] **Step 1: Write failing tests:**

```python
def test_health_is_liveness_only(monkeypatch):
    # liveness must not require a DB connection
    monkeypatch.setenv("DATABASE_URL", "postgresql://invalid:invalid@localhost:1/none")
    from importlib import reload
    import backend.app.config as cfg; reload(cfg)
    import backend.app.main as m; reload(m)
    from fastapi.testclient import TestClient
    # liveness route returns 200 even though lifespan DB connect will fail;
    # call the function directly to assert no DB dependency
    import asyncio
    assert asyncio.get_event_loop().run_until_complete(m.health())["status"] == "ok"

def test_system_reports_real_db_state(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)
    from backend.app.main import app
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        sys = client.get("/api/system").json()
        assert sys["database"] == "connected"
        assert sys["schema_version"] == "2026.06.27"
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `db.ping()` (runs `SELECT 1`, returns bool, never raises). Rewrite `system_payload()` to call `ping()` and report `database: "connected"|"error"`, real counts or nulls; `/api/system` and `/health/ready` return 503 when not ready. `/health` returns `{"status":"ok","service":"factory-api"}` with no DB call. Add `logging_config.py` and a global `@app.exception_handler(Exception)` returning JSON 500 + logged traceback. Source `schema_version`/`dataset_seed` from config.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit.

```bash
git add backend/app/main.py backend/app/db.py backend/app/logging_config.py tests/test_api_contracts.py
git commit -m "feat(api): honest liveness/readiness health, logging, exception handler"
```

---

## Task 7: Backend — TTL cache + Cache-Control headers

**Files:**
- Create: `backend/app/cache.py`
- Modify: `backend/app/routers/*.py` (wrap data fetches)
- Modify: `backend/app/main.py` (Cache-Control middleware for `/api/*` GET)
- Create: `tests/test_cache.py`

**Interfaces:**
- Produces: `@ttl_cache(seconds: int)` async decorator (keyed by args); cache is process-local, dependency-free.

- [ ] **Step 1: Write failing test** in `tests/test_cache.py` (no DB):

```python
import asyncio
from backend.app.cache import ttl_cache

def test_ttl_cache_memoizes():
    calls = {"n": 0}
    @ttl_cache(seconds=60)
    async def f(x):
        calls["n"] += 1
        return x * 2
    out = asyncio.run(_run(f))
    assert out == (4, 4) and calls["n"] == 1

async def _run(f):
    return (await f(2), await f(2))
```

- [ ] **Step 2:** Run → FAIL (no module).
- [ ] **Step 3:** Implement `ttl_cache` (dict of key→(expiry, value), monotonic clock). Apply to the static-data view endpoints. Add a Cache-Control response middleware (`public, max-age=300`) for `/api/*` GETs except `/api/system`/health.
- [ ] **Step 4:** Run cache test + full contract suite → PASS.
- [ ] **Step 5:** Commit.

```bash
git add backend/app/cache.py backend/app/routers backend/app/main.py tests/test_cache.py
git commit -m "feat(api): dependency-free TTL cache + Cache-Control for static data"
```

---

## Task 8: Backend — real SQL on methodology/views + dim_station-backed loss view + new validation checks

**Files:**
- Modify: `db/analytical_views.sql` (`v_loss_by_station` joins `dim_station`; add orphan-station checks to `v_validation`)
- Modify: `backend/app/routers/methodology.py` (`/views` returns real `pg_get_viewdef`)
- Modify: `backend/app/routers/exec.py` (drop `STATION_NAMES`; use view's `station_name`)
- Modify: `tests/test_validation_endpoint.py`

**Interfaces:**
- Consumes: `dim_station`.
- Produces: `v_loss_by_station` with `station_name` from `dim_station`; `methodology/views` returns actual view DDL.

- [ ] **Step 1: Write failing test** in `tests/test_validation_endpoint.py`: assert the validation payload contains `orphan defect stations (root)` with status `pass`, and that `/api/methodology/views` returns logic strings containing `SELECT` (no `"..."`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Update `v_loss_by_station` to `JOIN dim_station ds ON ds.station_id = j.station` and select `ds.station_name`. Add two `v_validation` checks (orphan root/detected stations vs `dim_station`). Rewrite `methodology.py` `/views` to `SELECT pg_get_viewdef('v_oee', true)` etc. for the backing views. Remove `STATION_NAMES` from `exec.py` and the Python-side name patching.
- [ ] **Step 4:** Reapply views to local DB; run → PASS. Confirm frontend `StationLoss.station_name` still populated.
- [ ] **Step 5:** Commit.

```bash
git add db/analytical_views.sql backend/app/routers/methodology.py backend/app/routers/exec.py tests/test_validation_endpoint.py
git commit -m "feat(api): real view DDL on proof endpoint, dim_station-backed loss view, orphan checks"
```

---

## Task 9: Propagate regenerated numbers across the repo

**Files:**
- Modify: `README.md`, `INSIGHTS.md`, `tests/test_api_contracts.py`, any frontend copy in `frontend/app/page.tsx` / `frontend/components/*` with hardcoded figures.

**Interfaces:**
- Consumes: numbers captured in Task 4.

- [ ] **Step 1:** Replace `fact_defect_events == 726793` (and any other count assertions) in `tests/test_api_contracts.py` with the regenerated values.
- [ ] **Step 2:** Update `README.md` example system response counts and any narrative percentages (night-shift %, 69% downstream, 43% weld, 15/17% PM, etc.) to the recomputed values.
- [ ] **Step 3:** Update `INSIGHTS.md` figures (OEE %, units, hours, all narrative percentages and the event table).
- [ ] **Step 4:** Grep frontend for hardcoded numbers; the report derives most from the API, but fix any literals.
- [ ] **Step 5:** Run full suite against local DB → PASS. Commit.

```bash
git add README.md INSIGHTS.md tests/test_api_contracts.py frontend
git commit -m "docs: propagate regenerated dataset numbers across repo and tests"
```

---

## Task 10: Frontend — extract + test derived metrics, loading/error states

**Files:**
- Create: `frontend/lib/derive.ts`
- Modify: `frontend/app/page.tsx`
- Create: `frontend/lib/derive.test.ts`
- Create: `frontend/components/Skeleton.tsx`
- Modify: `frontend/package.json` (vitest, RTL, `test`, `typecheck` scripts)
- Create: `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`

**Interfaces:**
- Produces: pure fns `crewGap(mttr)->number`, `topLoss(loss)->StationLoss`, `top3Pct(rootCause)->number`, `risingCount(candidates)->number`.

- [ ] **Step 1:** Add devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`. Add scripts `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`. Create `vitest.config.ts` (jsdom env) + setup.
- [ ] **Step 2: Write failing tests** `frontend/lib/derive.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { crewGap, top3Pct, risingCount } from "./derive";

describe("derive", () => {
  it("crewGap = pct between best and worst MTTR", () => {
    expect(crewGap([
      { crew: "A", faults: 1, mttr_min: 40, total_downtime_hrs: 1 },
      { crew: "D", faults: 1, mttr_min: 52, total_downtime_hrs: 1 },
    ])).toBe(30);
  });
  it("top3Pct sums first three", () => {
    expect(top3Pct([{pct_of_all:30},{pct_of_all:20},{pct_of_all:10},{pct_of_all:5}] as any)).toBe("60");
  });
  it("risingCount counts rising trends", () => {
    expect(risingCount([{trend:"rising"},{trend:"stable"},{trend:"rising"}] as any)).toBe(2);
  });
});
```

- [ ] **Step 3:** Run `npm test` → FAIL.
- [ ] **Step 4:** Create `frontend/lib/derive.ts` with those pure fns; refactor `page.tsx` to import them. Add `Skeleton.tsx` and render skeletons while `d === null && !err`; keep the existing error block but make it friendlier.
- [ ] **Step 5:** Run `npm test` and `npm run typecheck` → PASS.
- [ ] **Step 6:** Commit.

```bash
git add frontend/lib/derive.ts frontend/lib/derive.test.ts frontend/app/page.tsx frontend/components/Skeleton.tsx frontend/package.json frontend/vitest.config.ts frontend/vitest.setup.ts frontend/package-lock.json
git commit -m "feat(web): extract+test derived metrics, add skeletons, vitest setup"
```

---

## Task 11: Frontend — render smoke test

**Files:**
- Create: `frontend/app/page.test.tsx`

- [ ] **Step 1: Write test** mocking `@/lib/api` so all calls resolve; render `<Report/>`; assert the heading "Automotive Assembly Intelligence" appears after data resolves.
- [ ] **Step 2:** Run `npm test` → PASS (write the mock to make it pass).
- [ ] **Step 3:** Commit.

```bash
git add frontend/app/page.test.tsx
git commit -m "test(web): render smoke test for the report page"
```

---

## Task 12: CI — split fast unit job vs Postgres integration job + lint + typecheck

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** Add a `unit` job (no services): install ruff + pytest + numpy/pandas; run `ruff check .` and `pytest -q -m "not db" tests/test_generator_helpers.py tests/test_cache.py`.
- [ ] **Step 2:** Keep the Postgres `integration` job (rename), running the full `pytest -q` against the service.
- [ ] **Step 3:** Extend `frontend-build` to also run `npm run typecheck` and `npm test` before `npm run build`.
- [ ] **Step 4:** Mark DB-requiring tests with `@pytest.mark.db` so `-m "not db"` selects only unit tests. Verify locally: `pytest -m "not db" -q` runs without a DB.
- [ ] **Step 5:** Commit.

```bash
git add .github/workflows/ci.yml tests
git commit -m "ci: split fast unit job from Postgres integration; add ruff, typecheck, web tests"
```

---

## Task 13: Docs — README + finalize

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Document new endpoints (`/health` vs `/health/ready`), generator CLI flags, `docker compose up -d` quickstart, `make demo`, lint/test commands, and `dim_station` in the schema/section list.
- [ ] **Step 2:** Verify `make demo` (or `tasks.ps1 demo`) runs the full local pipeline end to end.
- [ ] **Step 3:** Run the complete suite once more against the local DB → all PASS. Commit.

```bash
git add README.md
git commit -m "docs: document new endpoints, generator CLI, docker/make quickstart"
```

---

## Self-Review

**Spec coverage:**
- A. Backend contracts → Tasks 5, 6, 7, 8 ✓
- B. Data model → Tasks 2, 8 ✓
- C. Generator → Task 3 ✓
- D. Frontend → Tasks 10, 11 ✓
- E. Testing/CI → Tasks 1 (config), 3/5/6/7/10/11 (tests), 12 (CI) ✓
- F. DX → Tasks 1, 13 ✓
- G. Recompute & propagate → Tasks 4, 9 ✓

**Placeholder scan:** Mechanical/large steps (dataset regeneration output, full 650-line generator refactor, full schema bodies) are described with exact files, exact edits, and verification commands rather than inlined verbatim, since the executor has the codebase in context; all genuinely new code (schemas, cache, health, derive, tests) is shown.

**Type consistency:** Pydantic model field names in Task 5 mirror `frontend/lib/api.ts` exactly; derive fn names (`crewGap`, `top3Pct`, `risingCount`, `topLoss`) consistent between Task 10 definition and `page.tsx` usage; `db.ping()` defined in Task 6 and used there only.
