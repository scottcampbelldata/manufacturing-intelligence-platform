import os

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
        assert payload["tables"]["fact_defect_events"] == 726793


def test_openapi_docs_available(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        docs = client.get("/docs")
        assert docs.status_code == 200
        openapi = client.get("/openapi.json")
        assert openapi.status_code == 200
        assert "/api/system" in openapi.json()["paths"]
