"""Dependency-free async TTL cache.

The dataset is static between reloads, so analytical query results can be
memoized for a while instead of re-hitting PostgreSQL on every dashboard load.
This is a tiny in-process cache (no Redis); a process restart or reload clears
it, which is exactly the right lifetime for this data.
"""
import functools
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

from . import db
from .config import CACHE_TTL_SECONDS

T = TypeVar("T")


def ttl_cache(seconds: int) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Memoize an async function's result per argument tuple for `seconds`."""

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        store: dict[tuple, tuple[float, T]] = {}

        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            hit = store.get(key)
            if hit is not None and hit[0] > now:
                return hit[1]
            value = await func(*args, **kwargs)
            store[key] = (now + seconds, value)
            return value

        wrapper.cache_clear = store.clear  # type: ignore[attr-defined]
        return wrapper

    return decorator


# Cached drop-in replacements for the db fetch helpers. Routers import these as
# `fetch_all` / `fetch_one`, so call sites are unchanged. Keyed on (sql, args),
# so each distinct query/parameter combination is cached independently.
cached_fetch_all = ttl_cache(CACHE_TTL_SECONDS)(db.fetch_all)
cached_fetch_one = ttl_cache(CACHE_TTL_SECONDS)(db.fetch_one)
