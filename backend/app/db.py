"""asyncpg connection pool + JSON-safe row helpers."""
from decimal import Decimal
from datetime import datetime, date
import asyncpg

from .config import DATABASE_URL

_pool: asyncpg.Pool | None = None


async def connect() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=8)


async def disconnect() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def _clean(value):
    """Make asyncpg-returned values JSON-serializable."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


async def fetch_all(sql: str, *args) -> list[dict]:
    assert _pool is not None, "pool not initialized"
    async with _pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
    return [{k: _clean(v) for k, v in r.items()} for r in rows]


async def fetch_one(sql: str, *args) -> dict | None:
    rows = await fetch_all(sql, *args)
    return rows[0] if rows else None
