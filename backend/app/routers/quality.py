"""Quality & root-cause endpoints (page 3)."""
from fastapi import APIRouter
from ..db import fetch_all, fetch_one

router = APIRouter(prefix="/api/quality", tags=["quality"])

# Friendly station names for the frontend.
STATION_NAMES = {
    "ST01": "Stamping", "ST02": "Body Framing", "ST03": "Robotic Spot Weld",
    "ST04": "Paint", "ST05": "Trim", "ST06": "Final Assembly",
    "ST07": "Final Inspection", "ST08": "Roll & Brake Test",
}


def _label(rows, key):
    for r in rows:
        r["station_name"] = STATION_NAMES.get(r[key], r[key])
    return rows


@router.get("/root-cause")
async def root_cause():
    """Where defects truly originate (root-cause station ranking)."""
    rows = await fetch_all(
        "SELECT * FROM v_rootcause_ranking ORDER BY defects_caused DESC"
    )
    return _label(rows, "root_cause_station")


@router.get("/detection")
async def detection():
    """Where defects are caught (detection-station ranking; QC dominates)."""
    rows = await fetch_all(
        "SELECT * FROM v_detection_ranking ORDER BY defects_detected DESC"
    )
    return _label(rows, "detected_station")


@router.get("/propagation")
async def propagation():
    """Headline: share of defects detected downstream of their origin."""
    return await fetch_one("SELECT * FROM v_propagation")


@router.get("/propagation-paths")
async def propagation_paths():
    """Top origin -> detection flows."""
    return await fetch_all(
        "SELECT * FROM v_propagation_paths ORDER BY n DESC LIMIT 12"
    )
