"""
Automotive Assembly Intelligence -- FastAPI backend.

Serves the analytical SQL views as JSON endpoints for the Next.js dashboard.
Run (dev):  uvicorn app.main:app --reload --port 8000
Run (prod): via systemd (see deploy/factory-api.service)
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import db
from .config import CACHE_TTL_SECONDS, CORS_ORIGINS, DATASET_SEED, SCHEMA_VERSION
from .logging_config import configure_logging
from .routers import exec, kpi, methodology, quality, reliability, shifts, trends
from .schemas import Health, SystemStatus

logger = configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await db.connect()
        logger.info("Database pool connected")
    except Exception:
        # Don't crash the process on a DB outage at boot; readiness will report
        # the failure and the service can recover once the DB returns.
        logger.exception("Database pool failed to connect at startup")
    yield
    await db.disconnect()
    logger.info("Database pool closed")


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


@app.middleware("http")
async def cache_control(request: Request, call_next):
    """Let browsers/CDN cache the static analytical data, but never the
    health/readiness endpoints (whose whole point is to reflect live state)."""
    response = await call_next(request)
    path = request.url.path
    if (
        request.method == "GET"
        and path.startswith("/api/")
        and path != "/api/system"
    ):
        response.headers.setdefault(
            "Cache-Control", f"public, max-age={CACHE_TTL_SECONDS}"
        )
    return response

app.include_router(kpi.router)
app.include_router(exec.router)
app.include_router(shifts.router)
app.include_router(quality.router)
app.include_router(reliability.router)
app.include_router(trends.router)
app.include_router(methodology.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the traceback and return a clean JSON 500 instead of a stack page."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": "internal server error"})


async def system_payload() -> dict:
    """Readiness + dataset metadata. Reports the real DB state; never raises."""
    ready = await db.ping()
    empty_tables = {
        "dim_station": None,
        "dim_asset": None,
        "fact_fault_events": None,
        "fact_defect_events": None,
        "fact_production": None,
    }
    payload = {
        "status": "ok" if ready else "error",
        "service": "factory-api",
        "database": "connected" if ready else "error",
        "schema_version": SCHEMA_VERSION,
        "dataset_seed": DATASET_SEED,
        "db": ready,
        "date_min": None,
        "date_max": None,
        "tables": dict(empty_tables),
    }
    if not ready:
        return payload

    try:
        row = await db.fetch_one(
            """
            SELECT
                (SELECT COUNT(*) FROM dim_station) AS station_rows,
                (SELECT COUNT(*) FROM dim_asset) AS asset_rows,
                (SELECT COUNT(*) FROM fact_fault_events) AS fault_event_rows,
                (SELECT COUNT(*) FROM fact_defect_events) AS defect_event_rows,
                (SELECT COUNT(*) FROM fact_production) AS production_rows,
                (SELECT MIN(ts)::date FROM fact_production) AS date_min,
                (SELECT MAX(ts)::date FROM fact_production) AS date_max
            """
        )
    except Exception:
        logger.exception("system_payload count query failed")
        payload["status"] = "error"
        payload["database"] = "error"
        payload["db"] = False
        return payload

    payload["date_min"] = row["date_min"] if row else None
    payload["date_max"] = row["date_max"] if row else None
    payload["tables"] = {
        "dim_station": row["station_rows"] if row else None,
        "dim_asset": row["asset_rows"] if row else None,
        "fact_fault_events": row["fault_event_rows"] if row else None,
        "fact_defect_events": row["defect_event_rows"] if row else None,
        "fact_production": row["production_rows"] if row else None,
    }
    return payload


@app.get("/health", response_model=Health)
async def health():
    """Liveness: the process is up. Deliberately does NOT touch the database."""
    return {"status": "ok", "service": "factory-api"}


@app.get("/health/ready", response_model=SystemStatus)
async def health_ready():
    """Readiness: returns 503 unless the database is reachable."""
    payload = await system_payload()
    if not payload["db"]:
        return JSONResponse(status_code=503, content=payload)
    return payload


@app.get("/api/system", response_model=SystemStatus)
async def system():
    """Dataset + DB status for reviewers. 503 when the database is unreachable."""
    payload = await system_payload()
    if not payload["db"]:
        return JSONResponse(status_code=503, content=payload)
    return payload
