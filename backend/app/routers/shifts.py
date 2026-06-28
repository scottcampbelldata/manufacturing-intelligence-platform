"""Shift analysis endpoints -- the 'invisible night shift' (page 2)."""
from fastapi import APIRouter

from ..db import fetch_all
from ..schemas import Handoff, MttrCrew, YieldShift

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


@router.get("/mttr-by-crew", response_model=list[MttrCrew])
async def mttr_by_crew():
    """Mean-time-to-repair by crew. D-crew (night) runs longest."""
    return await fetch_all(
        "SELECT * FROM v_mttr_by_crew ORDER BY mttr_min DESC"
    )


@router.get("/handoff", response_model=list[Handoff])
async def handoff_effect():
    """Repair-time penalty in the 4-5am night-shift handoff window."""
    return await fetch_all(
        "SELECT * FROM v_shift_handoff_effect ORDER BY time_window"
    )


@router.get("/yield", response_model=list[YieldShift])
async def yield_by_shift():
    """Yield and throughput, day vs night."""
    return await fetch_all("SELECT * FROM v_yield_by_shift ORDER BY shift_type")
