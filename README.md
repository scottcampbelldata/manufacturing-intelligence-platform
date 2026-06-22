# Manufacturing Intelligence Platform

An end-to-end manufacturing analytics platform: a domain-realistic synthetic
dataset for a multi-station robotic assembly line, a PostgreSQL/TimescaleDB
star schema with an analytical view layer, a FastAPI backend, and a live
Next.js executive dashboard. Built to demonstrate full-stack data engineering
and BI delivery. **No proprietary data — the dataset is fully synthetic and
reproducible from a seeded generator.**

Live target: `https://factory.scottcampbell.io`

---

## What it shows

- **The "invisible night shift"** — night-crew repair time runs ~32% longer
  than the best day crew, spiking ~41% in the 4-5am handoff window. A loss
  that hides in daily totals and only appears at the shift grain.
- **Detection ≠ origin** — ~69% of defects are caught at QC but originate at
  upstream process stations (Laser Scribe, Lamination, Deposition produce the
  bulk of scrap). A real root-cause attribution model, not a defect count.
- **Event rediscovery** — the trend layer independently surfaces a laser-optics
  upgrade (scribe defects −34%), a supplier bad batch (+44%), and a PM program
  (mechanical faults −15%) with no labels, validated against a ground-truth
  events table.
- **Reliability decomposition** — an aging fleet, discrete replacement resets,
  and year-over-year seasonal severity, separated.

## Architecture

```
generator/   seeded Python generator -> CSVs (3-year, full fidelity, ~711k defects)
db/          star schema + analytical views + COPY loader (PostgreSQL/Timescale)
backend/     FastAPI -> serves the SQL views as JSON (asyncpg pool)
frontend/    Next.js + Recharts dashboard (5 analytic sections)
deploy/      systemd units, nginx reverse proxy, runbook
```

Data flow: generator → CSVs → Postgres (schema + COPY) → analytical views →
FastAPI JSON endpoints → Next.js dashboard, all behind nginx on one origin.

## Quick start (local)

```bash
# 1. data
cd generator && pip install numpy pandas && python generate_factory_data.py

# 2. db
createdb manufacturing
export DATABASE_URL=postgresql://localhost:5432/manufacturing
psql "$DATABASE_URL" -f db/schema.sql
pip install psycopg2-binary && python db/load_data.py
psql "$DATABASE_URL" -f db/analytical_views.sql

# 3. backend
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
DATABASE_URL="$DATABASE_URL" .venv/bin/uvicorn app.main:app --port 8000

# 4. frontend (new shell)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Full VPS deployment (systemd + nginx + TLS): see [`deploy/RUNBOOK.md`](deploy/RUNBOOK.md).

## Data provenance

Synthetic dataset modeled on general reliability-engineering and
manufacturing-operations principles (Weibull failure curves, shift/crew
variance, defect propagation, year-over-year seasonal severity, asset
replacements, process changes). No proprietary or employer data is used.
The generator is seeded (`SEED = 1970`); re-running reproduces the dataset
exactly. See `generator/generate_factory_data.py` for the full modeling notes.

## Stack

Python · pandas/numpy · PostgreSQL / TimescaleDB · FastAPI · asyncpg ·
Next.js 14 · TypeScript · Recharts · nginx · systemd
