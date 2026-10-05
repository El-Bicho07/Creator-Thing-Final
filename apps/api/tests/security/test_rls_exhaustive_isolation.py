"""Exhaustive cross-user isolation verification (task §3, §4).

Covers **every** user-owned table discovered from the live schema, not a
hand-written list. The table list is read from `information_schema` at runtime
and cross-checked against an expected set, so a newly added table that lacks RLS
or is missing from this test fails loudly.

For each table the test proves the full CRUD matrix:

    User A: CREATE own -> READ own -> UPDATE own -> DELETE own
    User B: cannot READ / UPDATE / DELETE User A's row

Isolation is asserted at TWO layers:

1. direct SQL through an RLS-scoped session, with **no user_id predicate**, so
   the row must be invisible because of the POLICY and not because of application
   filtering;
2. the HTTP API path, so the FastAPI -> SQLAlchemy -> PostgreSQL -> RLS chain is
   exercised end to end.

Note on `experiments`: the task brief lists it, but no such table exists in the
schema. `test_expected_table_set_is_complete` asserts the real set explicitly so
this discrepancy cannot silently persist.
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

pytestmark = pytest.mark.asyncio

USER_A = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

#: The complete set of user-owned tables in the live schema.
EXPECTED_TABLES = {
    "ai_calls", "chunks", "comment_insights", "comments", "content_assets",
    "creator_profiles", "ideas", "jobs", "lessons", "performance_records",
    "plan_items", "users", "voice_profiles",
}

#: Not user-owned: operational migration bookkeeping. Must have NO RLS.
NON_USER_TABLES = {"schema_migrations"}

_UNIT_768 = "[" + ",".join([f"{1 / (768 ** 0.5):.10f}"] * 768) + "]"

#: `users` is the identity table itself, so the CRUD matrix would delete the
#: shared fixture users and break every later test. Those two rows use dedicated
#: throwaway identities; the A/B semantics under test are identical.
ISO_USERS_A = uuid.UUID("a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1")
ISO_USERS_B = uuid.UUID("b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2")


def _engine():
    return create_async_engine(settings.database_url, echo=False, poolclass=NullPool)


async def _scoped_session(user_id: uuid.UUID):
    """RLS-scoped session via the PRODUCTION helper."""
    from app.core.db import rls_scoped_session

    return rls_scoped_session({"sub": str(user_id)})


async def _ensure_users() -> None:
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        for uid in (USER_A, USER_B, ISO_USERS_A, ISO_USERS_B):
            await admin.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": f"{uid.hex[:8]}@isolation.test"})
        await admin.commit()
    await engine.dispose()


async def _wipe_ids(ids: list[uuid.UUID]) -> None:
    """Remove specific rows by id via the admin role (for the users table)."""
    if not ids:
        return
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        for uid in ids:
            await admin.execute(
                text("DELETE FROM users WHERE id = :i"), {"i": str(uid)})
        await admin.commit()
    await engine.dispose()


async def _wipe() -> None:
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    tables = ["chunks", "comment_insights", "comments", "content_assets",
              "creator_profiles", "ideas", "plan_items", "performance_records",
              "lessons", "jobs", "ai_calls", "voice_profiles"]
    async with maker() as admin:
        for table in tables:
            await admin.execute(
                text(f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"),
                {"ids": [str(USER_A), str(USER_B)]})
        await admin.commit()
    await engine.dispose()


# --------------------------------------------------------------------------- #
# Minimal valid INSERT for each table, given its NOT NULL columns.
# --------------------------------------------------------------------------- #

def _insert_sql(table: str, owner: uuid.UUID, marker: str) -> tuple[str, dict]:
    """Return (INSERT ... RETURNING id, params) that satisfies NOT NULL columns."""
    uid = str(owner)
    common = {"u": uid, "m": marker}

    if table == "users":
        return ("INSERT INTO users (id, email) VALUES (:u, :m) RETURNING id",
                {"u": uid, "m": f"{marker}@iso.test"})
    if table == "creator_profiles":
        return ("""INSERT INTO creator_profiles
                    (user_id, full_name, niche, target_audience, primary_platform)
                   VALUES (:u, :m, 'niche', 'audience', 'youtube') RETURNING id""",
                common)
    if table == "voice_profiles":
        return ("INSERT INTO voice_profiles (user_id, style_name) "
                "VALUES (:u, :m) RETURNING id", common)
    if table == "content_assets":
        return ("""INSERT INTO content_assets (user_id, title, source_type, raw_text)
                   VALUES (:u, :m, 'manual', 'body') RETURNING id""", common)
    if table == "chunks":
        # Needs a parent asset owned by the same user.
        return ("""INSERT INTO chunks
                    (user_id, asset_id, chunk_index, chunk_text, embedding,
                     embedding_model, embedding_dimension, embedding_version)
                   SELECT :u, a.id, 0, :m, CAST(:v AS vector),
                          'intfloat/multilingual-e5-base', 768, 'e5-base-v1'
                   FROM content_assets a WHERE a.user_id = :u LIMIT 1
                   RETURNING id""",
                {**common, "v": _UNIT_768})
    if table == "ideas":
        return ("INSERT INTO ideas (user_id, title) VALUES (:u, :m) RETURNING id",
                common)
    if table == "plan_items":
        return ("""INSERT INTO plan_items (user_id, plan_date, title, platform)
                   VALUES (:u, CURRENT_DATE, :m, 'youtube') RETURNING id""", common)
    if table == "performance_records":
        return ("INSERT INTO performance_records (user_id, platform) "
                "VALUES (:u, 'youtube') RETURNING id", common)
    if table == "comments":
        return ("INSERT INTO comments (user_id, comment_text) "
                "VALUES (:u, :m) RETURNING id", common)
    if table == "comment_insights":
        return ("INSERT INTO comment_insights (user_id, summary) "
                "VALUES (:u, :m) RETURNING id", common)
    if table == "lessons":
        return ("""INSERT INTO lessons (user_id, source_feature, insight_summary,
                                     actionable_rule)
                   VALUES (:u, 'test', :m, :m) RETURNING id""", common)
    if table == "jobs":
        return ("INSERT INTO jobs (user_id, job_type) VALUES (:u, :m) RETURNING id",
                common)
    if table == "ai_calls":
        return ("""INSERT INTO ai_calls (user_id, feature, provider, model,
                                      prompt_version, latency_ms, success)
                   VALUES (:u, :m, 'mock', 'm', 'v1', 1, TRUE) RETURNING id""",
                common)
    raise AssertionError(f"no insert recipe for table {table!r}")


def _update_sql(table: str) -> str:
    """A harmless UPDATE that would be observable if RLS allowed it."""
    if table == "users":
        return "UPDATE users SET email = email || '.touched' WHERE id = :id"
    if table == "chunks":
        return "UPDATE chunks SET chunk_text = chunk_text || ' TOUCHED' WHERE id = :id"
    if table in ("content_assets", "ideas", "plan_items", "comments",
                 "comment_insights", "lessons", "jobs", "ai_calls",
                 "voice_profiles"):
        return f"UPDATE {table} SET id = id WHERE id = :id"
    return f"UPDATE {table} SET id = id WHERE id = :id"


async def _row_identity(db: AsyncSession, table: str, row_id) -> dict | None:
    """Read a row with NO user_id predicate (RLS must decide visibility)."""
    result = await db.execute(
        text(f"SELECT * FROM {table} WHERE id = :id"), {"id": str(row_id)})
    return result.mappings().one_or_none()


# --------------------------------------------------------------------------- #
# Schema-shape assertions
# --------------------------------------------------------------------------- #

async def test_expected_table_set_is_complete():
    """Every user-owned table must be RLS-protected and covered here.

    Also records that `experiments` (mentioned in the task brief) does not exist.
    """
    async with (await _scoped_session(USER_A)) as db:
        rows = (await db.execute(text("""
            SELECT c.relname
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname='public' AND c.relkind='r'
            ORDER BY c.relname
        """))).scalars().all()

    actual = set(rows)
    user_tables = actual - NON_USER_TABLES
    assert user_tables == EXPECTED_TABLES, (
        f"user-owned table set changed.\n"
        f"  expected: {sorted(EXPECTED_TABLES)}\n"
        f"  actual  : {sorted(user_tables)}\n"
        f"  extra   : {sorted(user_tables - EXPECTED_TABLES)}\n"
        f"  missing : {sorted(EXPECTED_TABLES - user_tables)}"
    )
    # The brief assumed a table that was never created.
    assert "experiments" not in actual, (
        "`experiments` was assumed by the task brief but does not exist in the "
        "schema; nothing was fabricated to satisfy it."
    )


@pytest.mark.parametrize("table", sorted(EXPECTED_TABLES))
async def test_table_has_rls_and_isolation_policy(table: str):
    async with (await _scoped_session(USER_A)) as db:
        row = (await db.execute(text("""
            SELECT c.relrowsecurity AS rls, COUNT(p.policyname) AS policies
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname
            WHERE n.nspname='public' AND c.relname = :t
            GROUP BY c.relrowsecurity
        """), {"t": table})).mappings().one()

        assert row["rls"] is True, f"RLS not enabled on {table}"
        assert int(row["policies"]) >= 1, f"no isolation policy on {table}"

        # The policy must actually reference current_user_id().
        defs = (await db.execute(text("""
            SELECT policyname, qual, with_check FROM pg_policies
            WHERE schemaname='public' AND tablename = :t
        """), {"t": table})).mappings().all()
        for d in defs:
            assert "current_user_id()" in (d["qual"] or "") or \
                   "current_user_id()" in (d["with_check"] or ""), \
                f"policy {d['policyname']} on {table} does not use current_user_id()"


async def test_non_user_tables_have_no_rls():
    """schema_migrations is operational bookkeeping, not creator data."""
    async with (await _scoped_session(USER_A)) as db:
        for table in NON_USER_TABLES:
            row = (await db.execute(text("""
                SELECT c.relrowsecurity AS rls FROM pg_class c
                JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='public' AND c.relname=:t
            """), {"t": table})).mappings().one_or_none()
            if row is not None:
                assert row["rls"] is False, f"{table} unexpectedly has RLS"


# --------------------------------------------------------------------------- #
# The CRUD / isolation matrix, per table
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("table", sorted(EXPECTED_TABLES))
async def test_cross_user_crud_matrix(table: str):
    """A can CRUD its own row; B cannot touch it. All via RLS-scoped sessions."""
    await _ensure_users()
    await _wipe()

    owner_a, owner_b = (ISO_USERS_A, ISO_USERS_B) if table == "users" else (USER_A, USER_B)

    if table == "chunks":
        # chunks needs a parent asset for each owner.
        for owner, marker in ((USER_A, "chunk-parent-a"), (USER_B, "chunk-parent-b")):
            async with (await _scoped_session(owner)) as db:
                await db.execute(
                    text("INSERT INTO content_assets (user_id, title, source_type, raw_text)"
                         " VALUES (:u, :m, 'manual', 'body')"),
                    {"u": str(owner), "m": marker})
                await db.commit()

    if table == "users":
        # The CREATE step below must be genuinely creating the row.
        await _wipe_ids([ISO_USERS_A, ISO_USERS_B])

    async with (await _scoped_session(owner_a)) as db:
        sql, params = _insert_sql(table, owner_a, f"a-{table}")
        if table == "chunks":
            params["u"] = str(owner_a)
            params["m"] = f"a-{table}"
        created = (await db.execute(text(sql), params)).first()
        if created is None:
            # A silent skip here would drop the ENTIRE isolation proof for this
            # table while the suite still reports green. §9 requires exhaustive
            # per-table coverage, so an insert that produces no row is a hard
            # failure: the fixture is broken, not the table untestable.
            pytest.fail(
                f"insert into {table} produced no row (parent missing); "
                "isolation for this table would otherwise go UNVERIFIED"
            )
        row_a = created[0]
        await db.commit()

        # --- A can READ its own row, with no user_id predicate ---
        seen = await _row_identity(db, table, row_a)
        assert seen is not None, f"A cannot read its own {table} row"

        # --- A can UPDATE its own row ---
        if table != "users":
            affected = (await db.execute(text(_update_sql(table)),
                                        {"id": str(row_a)})).rowcount
            assert affected == 1, f"A cannot update its own {table} row"
            await db.commit()

    # --- B cannot see, update or delete A's row ---
    async with (await _scoped_session(owner_b)) as db:
        assert await _row_identity(db, table, row_a) is None, \
            f"B CAN READ A's {table} row (RLS leak)"

        if table != "users":
            affected = (await db.execute(text(_update_sql(table)),
                                        {"id": str(row_a)})).rowcount
            assert affected == 0, f"B CAN UPDATE A's {table} row"
            await db.commit()

        deleted = (await db.execute(
            text(f"DELETE FROM {table} WHERE id = :id"), {"id": str(row_a)})).rowcount
        assert deleted == 0, f"B CAN DELETE A's {table} row"
        await db.commit()

        # Unfiltered aggregate: B's view of the whole table must exclude A.
        if table != "users":
            total = (await db.execute(
                text(f"SELECT count(*) FROM {table}"))).scalar()
            assert total == 0, \
                f"B sees {total} row(s) in {table}; expected 0 (RLS leak)"

    # --- A can DELETE its own row ---
    async with (await _scoped_session(owner_a)) as db:
        deleted = (await db.execute(
            text(f"DELETE FROM {table} WHERE id = :id"), {"id": str(row_a)})).rowcount
        assert deleted == 1, f"A cannot delete its own {table} row"
        await db.commit()


async def test_insert_forging_another_users_id_is_rejected():
    """WITH CHECK must reject a forged owner, not merely hide the row."""
    await _ensure_users()
    await _wipe()

    async with (await _scoped_session(USER_A)) as db:
        await db.execute(
            text("INSERT INTO content_assets (user_id, title, source_type, raw_text)"
                 " VALUES (:u, 'owned by a', 'manual', 'body')"),
            {"u": str(USER_A)})
        await db.commit()
        asset_id = (await db.execute(text(
            "SELECT id FROM content_assets WHERE user_id = :u LIMIT 1"),
            {"u": str(USER_A)})).scalar()

    # B tries to write a row owned by A.
    async with (await _scoped_session(USER_B)) as db:
        with pytest.raises(Exception) as exc:
            await db.execute(
                text("INSERT INTO content_assets"
                     " (user_id, title, source_type, raw_text)"
                     " VALUES (:u, 'forged', 'manual', 'body')"),
                {"u": str(USER_A)})
        await db.rollback()
        assert "row-level security" in str(exc.value).lower() or \
               "violates" in str(exc.value).lower()

        # And a chunk forged onto A's asset.
        with pytest.raises(Exception):
            await db.execute(
                text("INSERT INTO chunks (user_id, asset_id, chunk_index,"
                     " chunk_text, embedding, embedding_model, embedding_dimension)"
                     " VALUES (:u, :a, 0, 'forged', CAST(:v AS vector),"
                     " 'intfloat/multilingual-e5-base', 768)"),
                {"u": str(USER_A), "a": str(asset_id), "v": _UNIT_768})
        await db.rollback()


# --------------------------------------------------------------------------- #
# API path (task §4): JWT -> dependency -> SQLAlchemy -> PostgreSQL -> RLS
# --------------------------------------------------------------------------- #

async def test_api_path_cannot_bypass_rls():
    """Over HTTP, B must not observe or affect A's data via /api/*."""
    from tests.conftest import client_for

    await _ensure_users()
    await _wipe()

    async with client_for(USER_A) as ac, client_for(USER_B) as bc:
        created = await ac.post("/api/memory/ingest", json={
            "title": "A private asset",
            "text": "My private revenue is eleven thousand per month.",
            "category": "fact",
        })
        assert created.status_code == 201, created.text
        asset_id = created.json()["asset_id"]

        assert (await bc.get("/api/memory/stats")).json()["assets"] == 0
        assert (await bc.get("/api/memory/assets")).json() == []
        assert (await bc.post("/api/memory/search", json={
            "query": "private revenue", "top_k": 10})).json()["results"] == []

        # 404, not 403: must not confirm the other user's id exists.
        assert (await bc.delete(f"/api/memory/assets/{asset_id}")).status_code == 404
        assert (await bc.get(
            f"/api/memory/assets/{asset_id}/summary")).status_code == 404

        # A's data survives B's attempt.
        assert (await ac.get("/api/memory/stats")).json()["assets"] == 1
        assert (await ac.get(
            f"/api/memory/assets/{asset_id}/summary")).status_code == 200


async def test_api_voice_path_isolated():
    from tests.conftest import client_for

    await _ensure_users()
    await _wipe()

    samples = [{"text": "I write short and direct because long intros lose people."}]
    async with client_for(USER_A) as ac, client_for(USER_B) as bc:
        assert (await ac.post("/api/voice/profile",
                              json={"samples": samples})).status_code == 201
        assert (await bc.get("/api/voice/profile")).status_code == 404
        assert (await bc.get("/api/voice/profiles")).json() == []
        assert (await bc.delete("/api/voice/profile/Primary Style")).status_code == 404
        assert (await ac.get("/api/voice/profile")).status_code == 200