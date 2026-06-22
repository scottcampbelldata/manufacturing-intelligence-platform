"""Maintenance API while the manufacturing dataset is rebuilt."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import CORS_ORIGINS


app = FastAPI(
    title="Manufacturing Intelligence API",
    version="0.0.0-maintenance",
    description="Temporarily offline while the dataset and schema are rebuilt.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "maintenance", "db": False}


@app.get("/api/{path:path}")
async def api_maintenance(path: str):
    return JSONResponse(
        status_code=503,
        content={
            "status": "maintenance",
            "message": "Dataset and database are being rebuilt.",
        },
    )
