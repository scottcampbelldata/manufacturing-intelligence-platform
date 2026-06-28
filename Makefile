# Automotive Assembly Intelligence — task runner.
# Override the DB target with: make load DATABASE_URL=postgresql://...
DATABASE_URL ?= postgresql://postgres:postgres@localhost:5432/manufacturing
export DATABASE_URL

PY ?= python

.PHONY: help db-up db-down generate load views pipeline demo test test-unit lint typecheck

help:
	@echo "Targets:"
	@echo "  db-up      Start local PostgreSQL via docker compose"
	@echo "  db-down    Stop local PostgreSQL"
	@echo "  generate   Generate the synthetic dataset (CSVs in generator/output)"
	@echo "  load       Apply schema + COPY-load the CSVs"
	@echo "  views      Apply the analytical SQL views"
	@echo "  pipeline   generate -> load -> views"
	@echo "  demo       db-up + pipeline (end-to-end local bring-up)"
	@echo "  test       Full pytest suite (needs DATABASE_URL)"
	@echo "  test-unit  Fast unit tests only (no database)"
	@echo "  lint       ruff check"
	@echo "  typecheck  Frontend tsc --noEmit"

db-up:
	docker compose up -d --wait

db-down:
	docker compose down

generate:
	cd generator && $(PY) generate_factory_data.py

load:
	psql "$(DATABASE_URL)" -f db/schema.sql
	$(PY) db/load_data.py

views:
	psql "$(DATABASE_URL)" -f db/analytical_views.sql

pipeline: generate load views

demo: db-up pipeline
	@echo "Pipeline loaded. Start the API: cd backend && uvicorn app.main:app --port 8000"

test:
	pytest -q

test-unit:
	pytest -q -m "not db"

lint:
	ruff check .

typecheck:
	cd frontend && npm run typecheck
