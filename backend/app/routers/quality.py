"""Quality & root-cause endpoints (page 3)."""
from fastapi import APIRouter

from ..cache import cached_fetch_all as fetch_all
from ..cache import cached_fetch_one as fetch_one
from ..schemas import Detection, Propagation, PropagationPath, RootCause

router = APIRouter(prefix="/api/quality", tags=["quality"])


@router.get("/root-cause", response_model=list[RootCause])
async def root_cause():
    """Where defects truly originate (root-cause station ranking)."""
    return await fetch_all(
        "SELECT * FROM v_rootcause_ranking ORDER BY defects_caused DESC"
    )


@router.get("/detection", response_model=list[Detection])
async def detection():
    """Where defects are caught (detection-station ranking; QC dominates)."""
    return await fetch_all(
        "SELECT * FROM v_detection_ranking ORDER BY defects_detected DESC"
    )


@router.get("/propagation", response_model=Propagation)
async def propagation():
    """Headline: share of defects detected downstream of their origin."""
    return await fetch_one("SELECT * FROM v_propagation")


@router.get("/propagation-paths", response_model=list[PropagationPath])
async def propagation_paths():
    """Top origin -> detection flows."""
    return await fetch_all(
        "SELECT * FROM v_propagation_paths ORDER BY n DESC LIMIT 12"
    )
