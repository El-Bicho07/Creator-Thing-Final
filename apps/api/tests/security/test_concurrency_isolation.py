"""Concurrent cross-user verification (task §6).

Interleaves User A and User B requests against the shared connection pool and
asserts neither ever observes the other's rows.

This is the condition under which identity bugs actually appear: many
concurrent requests, each pinning its own connection, drawn from one pool. A
sequential A-then-B test cannot expose a pool-level identity leak, because a
single connection is reused in a predictable order.

If a genuine race is found, it is reported rather than suppressed: the barrier
below forces the requests to overlap rather than hoping they do.
"""
from __future__ import annotations

import asyncio
import json
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.db import rls_scoped_session

pytestmark = pytest.mark.asyncio

ROUNDS = 12

_CLAIMS_SQL = text("SELECT current_user_id()")


class AsyncBarrier:
    """Fallback barrier implementation for Python 3.10."""

    def __init__(self, parties: int):
        self.parties = parties
        self.count = 0
        self.event = asyncio.Event()

    async def wait(self):
        self.count += 1
        if self.count >= self.parties:
            self.event.set()
        else:
            await self.event.wait()


def _make_barrier(parties: int):
    if hasattr(asyncio, "Barrier"):
        return asyncio.Barrier(parties)
    return AsyncBarrier(parties)


async def _ensure_users(ids: list[uuid.UUID], *, clean: bool = False) -> None:
    """Create the users, and optionally wipe prior rows first.

    These users are intentionally distinct from the shared conftest fixtures, so
    the autouse `reset_test_data` fixture does not clean them. Each test therefore
    clears its own data, otherwise repeated runs accumulate assets and the
    assertions measure leftovers rather than isolation.
    """
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        for uid in ids:
            await admin.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": f"{uid.hex[:8]}@concurrent.test"})
        if clean:
            for table in ("chunks", "content_assets", "voice_profiles",
                          "ai_calls", "jobs"):
                await admin.execute(
                    text(f"DELETE FROM {table} "
                         "WHERE user_id = ANY(CAST(:ids AS uuid[]))"),
                    {"ids": [str(u) for u in ids]})
        await admin.commit()
    await engine.dispose()


async def _seed_distinct_marker(db: AsyncSession, user_id: uuid.UUID,
                                marker: str) -> uuid.UUID:
    """Insert one asset carrying a marker unique to this user."""
    asset_id = uuid.uuid4()
    await db.execute(
        text("""INSERT INTO content_assets
                   (id, user_id, title, source_type, raw_text)
                   VALUES (:i, :u, :t, 'manual', :b)"""),
        {"i": str(asset_id), "u": str(user_id), "t": marker, "b": marker})
    await db.commit()
    return asset_id


async def test_concurrent_requests_never_cross_identity():
    """A and B run interleaved; each must see only its own rows and identity."""
    user_a = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc")
    user_b = uuid.UUID("dddddddd-dddd-4ddd-8ddd-dddddddddddd")
    await _ensure_users([user_a, user_b], clean=True)

    marker_a = f"marker-exclusive-to-A-{user_a.hex[:8]}"
    marker_b = f"marker-exclusive-to-B-{user_b.hex[:8]}"

    # Seed each creator's own row (sequentially: seeding is setup, not the test).
    async with rls_scoped_session({"sub": str(user_a)}) as db:
        await _seed_distinct_marker(db, user_a, marker_a)
    async with rls_scoped_session({"sub": str(user_b)}) as db:
        await _seed_distinct_marker(db, user_b, marker_b)

    # `None` acts as a barrier: tasks run until all have reached this point.
    barrier = _make_barrier(2 * ROUNDS)
    failures: list[str] = []

    async def worker(user_id: uuid.UUID, own_marker: str,
                     other_marker: str) -> None:
        try:
            async with rls_scoped_session({"sub": str(user_id)}) as db:
                # Identity must be this worker throughout.
                observed = (await db.execute(_CLAIMS_SQL)).scalar()
                if observed != user_id:
                    failures.append(
                        f"identity mismatch: expected {user_id}, got {observed}")
                    return

                await barrier.wait()

                for _ in range(4):
                    identity = (await db.execute(_CLAIMS_SQL)).scalar()
                    if identity != user_id:
                        failures.append(
                            f"identity drifted mid-request: {user_id} -> {identity}")
                        return

                    rows = (await db.execute(
                        text("SELECT raw_text FROM content_assets")
                    )).scalars().all()

                    # Must see ONLY our own row.
                    if other_marker in rows:
                        failures.append(
                            f"{user_id} observed the other creator's row")
                        return
                    if own_marker not in rows:
                        failures.append(
                            f"{user_id} could not see its own row ({rows!r})")
                        return

                    # And a targeted probe for the other creator's asset.
                    hits = (await db.execute(
                        text("SELECT raw_text FROM content_assets "
                             "WHERE raw_text LIKE :p"),
                        {"p": f"%{other_marker}%"},
                    )).scalars().all()
                    if hits:
                        failures.append(
                            f"{user_id} retrieved the other creator's asset "
                            f"by content: {hits!r}")
                        return

                    await db.commit()
        except Exception as exc:  # surface, never swallow
            failures.append(f"{user_id}: {type(exc).__name__}: {exc}")

    tasks = []
    for _ in range(ROUNDS):
        tasks.append(asyncio.create_task(worker(user_a, marker_a, marker_b)))
        tasks.append(asyncio.create_task(worker(user_b, marker_b, marker_a)))

    await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=120)

    assert not failures, "concurrency isolation failures:\n" + "\n".join(
        f"  - {f}" for f in failures[:10])


async def test_concurrent_requests_over_http_api():
    """Same guarantee, through the full API path."""
    from tests.conftest import client_for

    user_a = uuid.UUID("eeeeeeee-1111-4111-8111-eeeeeeeeeeee")
    user_b = uuid.UUID("ffffffff-2222-4222-8222-ffffffffffff")
    await _ensure_users([user_a, user_b], clean=True)

    barrier = _make_barrier(8)
    failures: list[str] = []

    async def hammer(client, expect_count: int, own_title: str,
                     other_title: str) -> None:
        try:
            await barrier.wait()
            for _ in range(3):
                assets = await client.get("/api/memory/assets")
                if assets.status_code != 200:
                    failures.append(f"assets -> {assets.status_code}")
                    return
                titles = [a["title"] for a in assets.json()]
                if other_title in titles:
                    failures.append(f"observed foreign asset {other_title!r}")
                    return
                if titles.count(own_title) != expect_count:
                    failures.append(
                        f"expected {expect_count}x {own_title!r}, got {titles!r}")
                    return
        except Exception as exc:
            failures.append(f"{type(exc).__name__}: {exc}")

    async with client_for(user_a) as ac, client_for(user_b) as bc:
        title_a = "A-concurrent-asset"
        title_b = "B-concurrent-asset"
        assert (await ac.post("/api/memory/ingest", json={
            "title": title_a,
            "text": "A private note about batching content on Sunday mornings."})).status_code == 201
        assert (await bc.post("/api/memory/ingest", json={
            "title": title_b,
            "text": "B private note about pricing experiments last quarter."})).status_code == 201

        await asyncio.wait_for(
            asyncio.gather(
                hammer(ac, 1, title_a, title_b),
                hammer(bc, 1, title_b, title_a),
                hammer(ac, 1, title_a, title_b),
                hammer(bc, 1, title_b, title_a),
                hammer(ac, 1, title_a, title_b),
                hammer(bc, 1, title_b, title_a),
                hammer(ac, 1, title_a, title_b),
                hammer(bc, 1, title_b, title_a),
                return_exceptions=True,
            ),
            timeout=180,
        )

    assert not failures, "API concurrency isolation failures:\n" + "\n".join(
        f"  - {f}" for f in failures[:10])


async def test_pool_exhaustion_does_not_leak_identity():
    """Force more concurrent sessions than pool size.

    If the pool is saturated, connections must queue -- never be shared between
    two identities.
    """
    from app.core.db import engine as production_engine

    pool = getattr(production_engine, "pool", None)
    size = getattr(pool, "size", lambda: None)() if pool else None

    user_a = uuid.UUID("12121212-3333-4333-8333-121212121212")
    user_b = uuid.UUID("34343434-5555-4555-8555-343434343434")
    await _ensure_users([user_a, user_b], clean=True)

    pressure = (size or 5) * 3
    failures: list[str] = []

    async def hold(user_id: uuid.UUID) -> None:
        try:
            async with rls_scoped_session({"sub": str(user_id)}) as db:
                for _ in range(3):
                    observed = (await db.execute(_CLAIMS_SQL)).scalar()
                    if observed != user_id:
                        failures.append(f"expected {user_id}, got {observed}")
                        return
                    await asyncio.sleep(0)
                    await db.commit()
        except Exception as exc:
            failures.append(f"{type(exc).__name__}: {exc}")

    await asyncio.wait_for(
        asyncio.gather(
            *[hold(user_a if i % 2 == 0 else user_b) for i in range(pressure)],
            return_exceptions=True,
        ),
        timeout=120,
    )

    assert not failures, "identity leak under pool pressure:\n" + "\n".join(
        f"  - {f}" for f in failures[:10])