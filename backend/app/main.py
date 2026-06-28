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
from .routers import exec, kpi, methodology, quality, reliability, shifts, trends


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


async def system_payload():
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
        "service": "factory-api",
        "database": "connected",
        "schema_version": "2026.06.01",
        "dataset_seed": 1970,
        "db": True,
        "date_min": row["date_min"] if row else None,
        "date_max": row["date_max"] if row else None,
        "tables": {
            "dim_asset": row["asset_rows"] if row else None,
            "fact_fault_events": row["fault_event_rows"] if row else None,
            "fact_defect_events": row["defect_event_rows"] if row else None,
            "fact_production": row["production_rows"] if row else None,
        },
    }


@app.get("/health")
async def health():
    return await system_payload()


@app.get("/api/system")
async def system():
    return await system_payload()
