"""Executive KPI endpoints (page 1)."""
from fastapi import APIRouter
from ..db import fetch_one

router = APIRouter(prefix="/api/kpi", tags=["kpi"])


@router.get("")
async def kpi_overall():
    """Headline KPIs across the full 3-year window."""
    return await fetch_one("SELECT * FROM v_kpi_overall")
