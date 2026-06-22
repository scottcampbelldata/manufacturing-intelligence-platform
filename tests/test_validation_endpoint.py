from fastapi.testclient import TestClient


def test_validation_endpoint_reports_expected_passes(loaded_db, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", loaded_db)

    from backend.app.main import app

    with TestClient(app) as client:
        response = client.get("/api/methodology/validation")

    assert response.status_code == 200
    rows = {row["check_name"]: row for row in response.json()}

    expected_passes = [
        "orphan faults (asset FK)",
        "orphan production (shift FK)",
        "yield reconciliation mismatches",
        "null downtime on faults",
    ]
    for check_name in expected_passes:
        assert rows[check_name]["status"] == "pass"

    assert rows["fact_defect_events rows"]["value"] == "726793"
    assert rows["fact_production rows"]["value"] == "78912"
