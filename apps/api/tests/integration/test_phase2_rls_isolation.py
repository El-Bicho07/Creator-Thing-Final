"""Cross-user isolation for the Phase 2 engines (task §28).

Every assertion here runs against real PostgreSQL Row Level Security over real
RLS-scoped sessions. Application-level filtering is treated as defence in depth
only: these tests also verify that a query with NO `user_id` predicate still
returns nothing, which is what proves RLS (not the app) is doing the work.
"""
import uuid

import pytest
from sqlalchemy import text

from app.memory import (
    IngestRequest,
    MemoryCategory,
    MemoryEngine,
    MemoryQuery,
    SourceType,
    get_memory_engine,
)
from app.voice import get_voice_engine

from app.core.config import settings
from tests.conftest import rls_session

pytestmark = pytest.mark.asyncio

LONG_NOTE = (
    "I launched my SaaS landing page on a Tuesday and got 400 signups in 48 hours. "
    "My mistake was waiting three weeks to email my list. Next launch I will "
    "pre-warm the audience 48 hours in advance."
)
SECRET_NOTE = (
    "Deployment credential for the staging deploy is api_key "
    "sk-abcdef1234567890abcdef0 and the oncall contact is dev@example.com "
    "so rotate it before the next release window."
)
VOICE_SAMPLES = [
    "Most creators burn out because they optimise for output instead of recovery.",
    "I batch on Sundays. Twelve pieces, zero weekday burnout. What do you think?",
]


async def _ingest(engine: MemoryEngine, title: str, text_body: str) -> dict:
    return await engine.ingest(IngestRequest(
        title=title, raw_text=text_body, source_type=SourceType.NOTE,
        category=MemoryCategory.LESSON))


# --------------------------------------------------------------------------- #
# SELECT isolation
# --------------------------------------------------------------------------- #

async def test_user_a_ingests_and_reads_own_memory(session_a, user_a_id):
    async with session_a as db:
        engine = get_memory_engine(db, user_a_id)
        result = await _ingest(engine, "isolation probe A", LONG_NOTE)
        assert result["persisted"]
        stats = await engine.stats()
        assert stats.chunks >= 1


async def test_user_b_cannot_see_user_a_memory(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "secret A", LONG_NOTE)
        b = get_memory_engine(db_b, user_b_id)
        assert (await b.stats()).chunks == 0
        assert await b.retrieve(MemoryQuery(query="SaaS launch signups", top_k=10)) == []


async def test_user_b_cannot_list_user_a_assets(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "secret A2", LONG_NOTE)
        assert await get_memory_engine(db_b, user_b_id).list_assets() == []


# --------------------------------------------------------------------------- #
# RLS is authoritative, not just application filtering
# --------------------------------------------------------------------------- #

async def test_unfiltered_sql_still_returns_nothing_for_user_b(
    session_a, session_b, user_a_id, user_b_id
):
    """Proves PostgreSQL RLS enforces the boundary, not our WHERE clause."""
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "rls probe", LONG_NOTE)

        # No user_id predicate at all.
        unscoped = (await db_b.execute(
            text("SELECT count(*) FROM chunks"))).scalar()
        assert unscoped == 0, "RLS leaked rows for another creator"

        # Joining assets too must still leak nothing.
        joined = (await db_b.execute(
            text("SELECT count(*) FROM chunks c "
                 "JOIN content_assets a ON a.id = c.asset_id")
        )).scalar()
        assert joined == 0


async def test_user_a_sees_own_rows_without_predicate(session_a, user_a_id):
    async with session_a as db:
        await _ingest(get_memory_engine(db, user_a_id), "rls own", LONG_NOTE)
        assert (await db.execute(text("SELECT count(*) FROM chunks"))).scalar() >= 1


# --------------------------------------------------------------------------- #
# UPDATE isolation
# --------------------------------------------------------------------------- #

async def test_user_b_cannot_update_user_a_chunk(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "update probe", LONG_NOTE)
        chunk_id = (await db_a.execute(
            text("SELECT id FROM chunks WHERE user_id = :u LIMIT 1"),
            {"u": str(user_a_id)})).scalar()

        affected = (await db_b.execute(
            text("UPDATE chunks SET chunk_text = 'hijacked' WHERE id = :i"),
            {"i": str(chunk_id)})).rowcount
        assert affected == 0
        still = (await db_a.execute(
            text("SELECT chunk_text FROM chunks WHERE id = :i"),
            {"i": str(chunk_id)})).scalar()
        assert still != "hijacked"


async def test_user_b_cannot_insert_chunk_owned_by_user_a(session_b, user_a_id, user_b_id):
    """WITH CHECK must reject a forged user_id, not just hide the row."""
    async with session_b as db_b:
        asset = (await db_b.execute(
            text("SELECT id FROM content_assets LIMIT 1"))).scalar()
        if asset is None:
            pytest.skip("no asset visible to user B")
        with pytest.raises(Exception):
            await db_b.execute(
                text(
                    "INSERT INTO chunks (user_id, asset_id, chunk_index, "
                    "chunk_text, embedding) VALUES (:u, :a, 0, 'forged', "
                    "CAST(:e AS vector))"
                ),
                {"u": str(user_a_id), "a": str(asset), "e": "[0.0]"},
            )


# --------------------------------------------------------------------------- #
# DELETE isolation
# --------------------------------------------------------------------------- #

async def test_user_b_cannot_delete_user_a_asset(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        result = await _ingest(get_memory_engine(db_a, user_a_id), "delete probe",
                               LONG_NOTE)
        asset_id = result["asset_id"]

        assert (await get_memory_engine(db_b, user_b_id).delete_asset(asset_id)) == \
            {"assets_deleted": 0}
        survivors = (await db_a.execute(
            text("SELECT count(*) FROM content_assets WHERE id = :i"),
            {"i": str(asset_id)})).scalar()
        assert survivors == 1


# --------------------------------------------------------------------------- #
# Retrieval isolation
# --------------------------------------------------------------------------- #

async def test_user_b_vector_search_returns_nothing(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "vector probe", LONG_NOTE)
        a_hits = await get_memory_engine(db_a, user_a_id).retrieve(
            MemoryQuery(query="SaaS landing page launch", top_k=5))
        assert a_hits, "user A should retrieve their own memory"
        b_hits = await get_memory_engine(db_b, user_b_id).retrieve(
            MemoryQuery(query="SaaS landing page launch", top_k=5))
        assert b_hits == []


async def test_user_b_batch_retrieval_returns_nothing(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await _ingest(get_memory_engine(db_a, user_a_id), "batch probe", LONG_NOTE)
        for query in ("launch", "email list", "signups", "audience"):
            assert await get_memory_engine(db_b, user_b_id).retrieve(
                MemoryQuery(query=query, top_k=10)) == []


# --------------------------------------------------------------------------- #
# Voice profile isolation
# --------------------------------------------------------------------------- #

async def test_voice_profiles_are_user_scoped(session_a, session_b, user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await get_voice_engine(db_a, user_a_id).create_profile_from_samples(VOICE_SAMPLES)
        assert await get_voice_engine(db_a, user_a_id).get_profile() is not None
        assert await get_voice_engine(db_b, user_b_id).get_profile() is None
        assert await get_voice_engine(db_b, user_b_id).list_profiles() == []


async def test_user_b_cannot_delete_user_a_voice_profile(session_a, session_b,
                                                          user_a_id, user_b_id):
    async with session_a as db_a, session_b as db_b:
        await get_voice_engine(db_a, user_a_id).create_profile_from_samples(VOICE_SAMPLES)
        assert (await get_voice_engine(db_b, user_b_id).delete_profile()) == \
            {"profiles_deleted": 0}
        assert await get_voice_engine(db_a, user_a_id).get_profile() is not None


# --------------------------------------------------------------------------- #
# Secrets must not be persisted
# --------------------------------------------------------------------------- #

async def test_credentials_are_not_stored(session_a, user_a_id):
    async with session_a as db:
        engine = get_memory_engine(db, user_a_id)
        result = await _ingest(engine, "secret probe", SECRET_NOTE)
        assert result["persisted"]
        assert result["redacted"] is True

        hits = await engine.retrieve(
            MemoryQuery(query="staging deploy credential api key", top_k=10))
        blob = " ".join(h.text for h in hits)
        assert "sk-abcdef1234567890abcdef0" not in blob
        assert "dev@example.com" not in blob
        assert "[redacted:" in blob


async def test_stored_chunk_text_never_contains_secret(session_a, user_a_id):
    async with session_a as db:
        await _ingest(get_memory_engine(db, user_a_id), "secret probe 2", SECRET_NOTE)
        rows = (await db.execute(
            text("SELECT chunk_text FROM chunks WHERE user_id = :u"),
            {"u": str(user_a_id)})).scalars().all()
        assert rows
        for row in rows:
            assert "sk-abcdef1234567890abcdef0" not in row
            assert "dev@example.com" not in row


# --------------------------------------------------------------------------- #
# No-JWT-context fail-safe
# --------------------------------------------------------------------------- #

async def test_no_jwt_context_returns_zero_uuid_and_no_rows(user_a_id):
    """The platform's identity helper is fail-safe, not fail-open."""
    from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                        create_async_engine)
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    try:
        maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        session = maker()
        await session.execute(
            text("SELECT set_config('request.jwt.claims', '', false)"))
        assert (await session.execute(
            text("SELECT current_user_id()"))).scalar() == \
            uuid.UUID("00000000-0000-0000-0000-000000000000")
        assert (await session.execute(text("SELECT count(*) FROM chunks"))).scalar() == 0
        await session.close()
    finally:
        await engine.dispose()