"""Executive layer -- OEE and the loss view (page 1)."""
from fastapi import APIRouter

from ..cache import cached_fetch_all as fetch_all
from ..cache import cached_fetch_one as fetch_one
from ..schemas import Oee, OeeLine, StationLoss

router = APIRouter(prefix="/api/exec", tags=["exec"])


@router.get("/oee", response_model=Oee)
async def oee():
    """Overall OEE with Availability / Performance / Quality breakdown."""
    return await fetch_one("SELECT * FROM v_oee")


@router.get("/oee/by-line", response_model=list[OeeLine])
async def oee_by_line():
    return await fetch_all("SELECT * FROM v_oee_by_line")


@router.get("/loss/by-station", response_model=list[StationLoss])
async def loss_by_station():
    """Where output is lost: downtime hours + scrap units, ranked. No dollars."""
    rows = await fetch_all(
        "SELECT * FROM v_loss_by_station ORDER BY (downtime_idx + scrap_idx) DESC"
    )
    return [
        {**r, "loss_index": round((r["downtime_idx"] or 0) + (r["scrap_idx"] or 0))}
        for r in rows
    ]
