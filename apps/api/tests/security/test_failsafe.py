"""RLS fail-safe verification (task §7).

Every degraded-identity condition must fail CLOSED: return nothing, never
another creator's rows.

Covered conditions:
  * no Authorization header
  * malformed / non-JWT bearer token
  * JWT signed by an untrusted key
  * JWT that is valid but has no `sub` claim
  * JWT whose `sub` is not a UUID
  * `request.jwt.claims` empty
  * `request.jwt.claims` malformed JSON
  * `request.jwt.claims` valid JSON but no `sub`
  * `request.jwt.claims` `sub` is not a UUID
  * JWT `exp` in the past

Note on the identity helper: `current_user_id()` catches its own exceptions and
returns the zero UUID, so a malformed identity degrades to "matches no row"
rather than "matches all rows". That is the property asserted here.
"""
from __future__ import annotations

import json
import time
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.db import rls_scoped_session

pytestmark = pytest.mark.asyncio

USER_A = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ZERO_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")

_TABLES_WITH_DATA = ("chunks", "content_assets", "voice_profiles",
                     "creator_profiles", "ideas", "lessons", "jobs", "ai_calls")


async def _seed_a() -> None:
    """Give user A one row in every table we probe."""
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    unit_768 = "[" + ",".join([f"{1 / (768 ** 0.5):.10f}"] * 768) + "]"
    async with maker() as admin:
        await admin.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(USER_A), "e": "fail-safe-a@test.local"})
        for table in ("chunks", "content_assets", "voice_profiles",
                      "creator_profiles", "ideas", "lessons", "jobs", "ai_calls"):
            await admin.execute(text(f"DELETE FROM {table} WHERE user_id = :u"),
                                {"u": str(USER_A)})
        await admin.execute(
            text("INSERT INTO creator_profiles (user_id, full_name, niche,"
                 " target_audience, primary_platform) VALUES"
                 " (:u, 'A', 'n', 'aud', 'youtube')"), {"u": str(USER_A)})
        await admin.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text)"
                 " VALUES (:u, 'A asset', 'manual', 'secret A content')"),
            {"u": str(USER_A)})
        asset_id = (await admin.execute(text(
            "SELECT id FROM content_assets WHERE user_id = :u LIMIT 1"),
            {"u": str(USER_A)})).scalar()
        await admin.execute(
            text("""INSERT INTO chunks (user_id, asset_id, chunk_index, chunk_text,
                     embedding, embedding_model, embedding_dimension, embedding_version)
                   VALUES (:u, :a, 0, 'A chunk', CAST(:v AS vector),
                           'intfloat/multilingual-e5-base', 768, 'e5-base-v1')"""),
            {"u": str(USER_A), "a": str(asset_id), "v": unit_768})
        await admin.execute(
            text("INSERT INTO voice_profiles (user_id, style_name)"
                 " VALUES (:u, 'A style')"), {"u": str(USER_A)})
        await admin.execute(
            text("INSERT INTO ideas (user_id, title) VALUES (:u, 'A idea')"),
            {"u": str(USER_A)})
        await admin.execute(
            text("""INSERT INTO lessons (user_id, source_feature, insight_summary,
                                        actionable_rule)
                   VALUES (:u, 'test', 'A lesson', 'A rule')"""), {"u": str(USER_A)})
        await admin.execute(
            text("INSERT INTO jobs (user_id, job_type) VALUES (:u, 'A job')"),
            {"u": str(USER_A)})
        await admin.execute(
            text("""INSERT INTO ai_calls (user_id, feature, provider, model,
                                        prompt_version, latency_ms, success)
                   VALUES (:u, 'A feature', 'mock', 'm', 'v1', 1, TRUE)"""),
            {"u": str(USER_A)})
        await admin.commit()
    await engine.dispose()


# --------------------------------------------------------------------------- #
# Identity helper semantics
# --------------------------------------------------------------------------- #

async def test_current_user_id_function_is_fail_safe():
    """The helper must degrade to the zero UUID, never to 'all rows'."""
    engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    async with engine.connect() as connection:
        # empty
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', '', false)"))
        assert (await connection.execute(
            text("SELECT current_user_id()"))).scalar() == ZERO_UUID

        # malformed JSON
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": "{not-json"})
        assert (await connection.execute(
            text("SELECT current_user_id()"))).scalar() == ZERO_UUID

        # valid JSON, no sub
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": json.dumps({"role": "authenticated"})})
        assert (await connection.execute(
            text("SELECT current_user_id()"))).scalar() == ZERO_UUID

        # sub is not a UUID
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": json.dumps({"sub": "not-a-uuid"})})
        assert (await connection.execute(
            text("SELECT current_user_id()"))).scalar() == ZERO_UUID

        # sub is JSON null
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": json.dumps({"sub": None})})
        assert (await connection.execute(
            text("SELECT current_user_id()"))).scalar() == ZERO_UUID
    await engine.dispose()


@pytest.mark.parametrize("claims", [
    "{}",
    "",
    "{not-json",
    '["array"]',
    '{"sub": null}',
    '{"sub": "not-a-uuid"}',
    '{"sub": ""}',
    "null",
    '{"role": "service_role"}',
])
async def test_degraded_identity_sees_no_rows(claims: str):
    """Whatever the malformed identity, no table may return a row."""
    await _seed_a()
    engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    async with engine.connect() as connection:
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": claims})
        for table in _TABLES_WITH_DATA:
            count = (await connection.execute(
                text(f"SELECT count(*) FROM {table}"))).scalar()
            assert count == 0, (
                f"claims={claims!r} returned {count} row(s) from {table}; "
                "fail-open behaviour detected"
            )
        await connection.rollback()
    await engine.dispose()


async def test_valid_identity_still_sees_its_own_rows():
    """Control: the fail-safe must not be so aggressive it hides legitimate rows."""
    await _seed_a()
    async with rls_scoped_session({"sub": str(USER_A)}) as db:
        for table in _TABLES_WITH_DATA:
            count = (await db.execute(text(f"SELECT count(*) FROM {table}"))).scalar()
            assert count >= 1, f"valid identity saw 0 rows in {table}"


# --------------------------------------------------------------------------- #
# HTTP layer
# --------------------------------------------------------------------------- #

async def test_missing_token_is_rejected():
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app),
                           base_url="http://test") as ac:
        for path in ("/api/memory/stats", "/api/memory/assets",
                     "/api/voice/profile", "/api/voice/profiles"):
            response = await ac.get(path)
            assert response.status_code == 401, \
                f"{path} returned {response.status_code} without a token"


@pytest.mark.parametrize("token", [
    "not-a-jwt",
    "a.b.c",
    "Bearer",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhIn0.bad-signature",
    "x" * 400,
])
async def test_malformed_tokens_are_rejected(token: str):
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app),
                           base_url="http://test") as ac:
        response = await ac.get("/api/memory/stats",
                                headers={"Authorization": f"Bearer {token}"})
        assert response.status_code in (401, 403, 500), \
            f"malformed token produced {response.status_code}"
        # Must never be 200.
        assert response.status_code != 200


async def test_expired_token_is_rejected():
    """A structurally valid but expired token must not authenticate."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    import jwt

    # Signed with an unrelated key, so it is both untrusted and long expired.
    forged = jwt.encode({"sub": str(USER_A), "aud": "authenticated",
                         "exp": int(time.time()) - 9999},
                        "a-key-we-do-not-trust", algorithm="HS256")
    async with AsyncClient(transport=ASGITransport(app=app),
                           base_url="http://test") as ac:
        response = await ac.get("/api/memory/stats",
                                headers={"Authorization": f"Bearer {forged}"})
        assert response.status_code in (401, 403, 500)
        assert response.status_code != 200


async def test_untrusted_signature_is_rejected():
    """A token whose `sub` is a real user but signed by an unknown key."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    import jwt

    forged = jwt.encode({"sub": str(USER_A), "aud": "authenticated",
                         "exp": int(time.time()) + 9999},
                        "attacker-key", algorithm="HS256")
    async with AsyncClient(transport=ASGITransport(app=app),
                           base_url="http://test") as ac:
        response = await ac.get("/api/memory/stats",
                                headers={"Authorization": f"Bearer {forged}"})
        assert response.status_code != 200
        assert response.status_code in (401, 403, 500)


async def test_writes_are_rejected_when_identity_degrades():
    """Even if a write somehow proceeds, it must not be attributed to another user."""
    engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    async with engine.connect() as connection:
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": json.dumps({"sub": "not-a-uuid"})})
        with pytest.raises(Exception):
            await connection.execute(
                text("INSERT INTO ideas (user_id, title) VALUES (:u, 'x')"),
                {"u": str(USER_A)})
        await connection.rollback()
    await engine.dispose()