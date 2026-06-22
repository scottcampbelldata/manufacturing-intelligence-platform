"""
Automotive Assembly Intelligence -- FastAPI backend.

Serves the analytical SQL views as JSON endpoints for the Next.js dashboard.
Run (dev):  uvicorn app.main:app --reload --port 8000
Run (prod): via systemd (see deploy/factory-api.service)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import CORS_ORIGINS
from .routers import kpi, exec, shifts, quality, reliability, trends, methodology


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="Automotive Assembly Intelligence API",
    version="1.0.0",
    description="Analytics API over a 3-year synthetic automotive-assembly dataset.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(kpi.router)
app.include_router(exec.router)
app.include_router(shifts.router)
app.include_router(quality.router)
app.include_router(reliability.router)
app.include_router(trends.router)
app.include_router(methodology.router)


@app.get("/health")
async def health():
    row = await db.fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM dim_asset) AS asset_rows,
            (SELECT COUNT(*) FROM fact_fault_events) AS fault_event_rows,
            (SELECT COUNT(*) FROM fact_defect_events) AS defect_event_rows,
            (SELECT COUNT(*) FROM fact_production) AS production_rows,
            (SELECT MIN(ts)::date FROM fact_production) AS date_min,
            (SELECT MAX(ts)::date FROM fact_production) AS date_max
        """
    )
    return {
        "status": "ok",
        "database": "connected",
        "db": True,
        **(row or {}),
    }
