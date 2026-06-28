"""Executive layer -- OEE and the loss view (page 1)."""
from fastapi import APIRouter

from ..db import fetch_all, fetch_one

router = APIRouter(prefix="/api/exec", tags=["exec"])

STATION_NAMES = {
    "ST01": "Stamping", "ST02": "Body Framing", "ST03": "Robotic Spot Weld",
    "ST04": "Paint", "ST05": "Trim", "ST06": "Final Assembly",
    "ST07": "Final Inspection", "ST08": "Roll & Brake Test",
}


@router.get("/oee")
async def oee():
    """Overall OEE with Availability / Performance / Quality breakdown."""
    return await fetch_one("SELECT * FROM v_oee")


@router.get("/oee/by-line")
async def oee_by_line():
    return await fetch_all("SELECT * FROM v_oee_by_line")


@router.get("/loss/by-station")
async def loss_by_station():
    """Where output is lost: downtime hours + scrap units, ranked. No dollars."""
    rows = await fetch_all(
        "SELECT * FROM v_loss_by_station ORDER BY (downtime_idx + scrap_idx) DESC"
    )
    for r in rows:
        r["station_name"] = STATION_NAMES.get(r["station"], r["station"])
        r["loss_index"] = round((r["downtime_idx"] or 0) + (r["scrap_idx"] or 0))
    return rows
