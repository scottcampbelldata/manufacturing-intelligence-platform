import asyncio

from fastapi.testclient import TestClient


def test_api_contracts(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        kpi = client.get("/api/kpi")
        assert kpi.status_code == 200
        assert {
            "line_hours",
            "total_produced",
            "total_scrap",
            "yield_pct",
            "total_faults",
            "production_hours",
        }.issubset(kpi.json())

        oee = client.get("/api/exec/oee")
        assert oee.status_code == 200
        assert {
            "availability_pct",
            "performance_pct",
            "quality_pct",
            "oee_pct",
        }.issubset(oee.json())

        system = client.get("/api/system")
        assert system.status_code == 200
        payload = system.json()
        assert payload["status"] == "ok"
        assert payload["database"] == "connected"
        assert payload["dataset_seed"] == 1970
        assert payload["tables"]["fact_defect_events"] == 725519


def test_openapi_docs_available(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        docs = client.get("/docs")
        assert docs.status_code == 200
        openapi = client.get("/openapi.json")
        assert openapi.status_code == 200
        assert "/api/system" in openapi.json()["paths"]


def test_openapi_is_typed(loaded_db, monkeypatch):
    """Every data endpoint declares a typed response schema (not an empty {})."""
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        spec = client.get("/openapi.json").json()
        # Named component schemas exist for the core models.
        assert "Oee" in spec["components"]["schemas"]
        assert "Kpi" in spec["components"]["schemas"]
        # The /api/kpi 200 response references a model, not an untyped object.
        kpi_schema = spec["paths"]["/api/kpi"]["get"]["responses"]["200"][
            "content"
        ]["application/json"]["schema"]
        assert "$ref" in kpi_schema


def test_health_is_liveness_only(loaded_db, monkeypatch):
    """/health is a pure liveness probe -- no database fields, no DB query."""
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok", "service": "factory-api"}


def test_system_reports_real_db_state(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.config import SCHEMA_VERSION
    from backend.app.main import app

    with TestClient(app) as client:
        r = client.get("/api/system")
        assert r.status_code == 200
        body = r.json()
        assert body["database"] == "connected"
        assert body["db"] is True
        assert body["schema_version"] == SCHEMA_VERSION
        assert body["tables"]["dim_station"] == 8


def test_system_payload_reports_error_when_db_unreachable():
    """With no pool connected, readiness must report error -- never raise."""
    import backend.app.main as m

    asyncio.run(m.db.disconnect())
    payload = asyncio.run(m.system_payload())
    assert payload["db"] is False
    assert payload["database"] == "error"
    assert payload["status"] == "error"
    assert payload["tables"]["fact_defect_events"] is None
