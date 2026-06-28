"""Unit tests for the dependency-free async TTL cache (no database)."""
import asyncio

from backend.app.cache import ttl_cache


def test_ttl_cache_memoizes_by_args():
    calls = {"n": 0}

    @ttl_cache(seconds=60)
    async def double(x):
        calls["n"] += 1
        return x * 2

    async def run():
        return await double(2), await double(2), await double(3)

    a, b, c = asyncio.run(run())
    assert (a, b, c) == (4, 4, 6)
    # f(2) computed once and reused; f(3) computed once.
    assert calls["n"] == 2


def test_ttl_cache_expires():
    calls = {"n": 0}

    @ttl_cache(seconds=0)  # already expired on next read
    async def f():
        calls["n"] += 1
        return calls["n"]

    async def run():
        return await f(), await f()

    a, b = asyncio.run(run())
    assert a == 1 and b == 2  # not cached because ttl is 0


def test_ttl_cache_clear():
    calls = {"n": 0}

    @ttl_cache(seconds=60)
    async def f():
        calls["n"] += 1
        return calls["n"]

    async def run():
        first = await f()
        f.cache_clear()
        second = await f()
        return first, second

    a, b = asyncio.run(run())
    assert a == 1 and b == 2
