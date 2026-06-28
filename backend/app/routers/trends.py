"""Trends & event-rediscovery endpoints (page 5)."""
from fastapi import APIRouter, Query

from ..db import fetch_all

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("/yield-by-quarter")
async def yield_by_quarter():
    """Quarterly yield trend (continuous improvement) + planned throughput."""
    return await fetch_all("SELECT * FROM v_yield_by_quarter")


@router.get("/defects-monthly")
async def defects_monthly(station: str | None = Query(None)):
    """Monthly defect counts, optionally filtered to one detected station
    (e.g. station=ST03 to see the laser-upgrade step change)."""
    if station:
        return await fetch_all(
            "SELECT mo, defects FROM v_defects_monthly "
            "WHERE detected_station=$1 ORDER BY mo",
            station,
        )
    return await fetch_all(
        "SELECT mo, SUM(defects) AS defects FROM v_defects_monthly "
        "GROUP BY mo ORDER BY mo"
    )


@router.get("/events")
async def events():
    """Ground-truth operational events (the rediscovery 'answer key')."""
    return await fetch_all(
        "SELECT event_date, end_date, category, detail FROM dim_events "
        "ORDER BY event_date"
    )
