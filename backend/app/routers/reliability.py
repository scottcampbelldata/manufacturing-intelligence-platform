"""Reliability & equipment-lifecycle endpoints (page 4)."""
from fastapi import APIRouter, Query
from ..db import fetch_all

router = APIRouter(prefix="/api/reliability", tags=["reliability"])


@router.get("/top-assets")
async def top_assets(limit: int = Query(12, ge=1, le=50)):
    """Worst-performing assets by fault count."""
    return await fetch_all(
        "SELECT * FROM v_top_faulting_assets ORDER BY faults DESC LIMIT $1",
        limit,
    )


@router.get("/faults-per-generation")
async def faults_per_generation():
    """Fault count per asset generation -- replacements reset the clock."""
    return await fetch_all(
        "SELECT * FROM v_faults_per_generation ORDER BY asset_id, generation"
    )


@router.get("/faults-by-quarter")
async def faults_by_quarter():
    """Quarterly fault count -- the aging-fleet trend."""
    return await fetch_all("SELECT * FROM v_faults_by_quarter")


@router.get("/summer-thermal")
async def summer_thermal():
    """Thermal faults per summer -- year-over-year season severity."""
    return await fetch_all(
        "SELECT * FROM v_summer_thermal ORDER BY yr"
    )


@router.get("/replace-candidates")
async def replace_candidates(limit: int = Query(10, ge=1, le=40)):
    """Robots whose fault rate is rising -- budget-to-replace shortlist."""
    return await fetch_all(
        "SELECT * FROM v_robot_candidates ORDER BY total_faults DESC LIMIT $1",
        limit,
    )
