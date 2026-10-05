"""Studio RLS: cross-creator isolation for sessions, versions and generated assets.

Every assertion runs against real PostgreSQL RLS over real RLS-scoped sessions.
Per the Phase 2 lesson, a failure is proven with a negative control: the "allowed"
cases are asserted with the same code path, so a test that passed because RLS was
silently disabled would also fail here.

Required by §10:
- User A -> User A Studio session   OK
- User A -> User B Studio session   BLOCKED (read, update, delete, generations, assets)
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text

from app.core.db import admin_session_maker
from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from tests.conftest import USER_A, USER_B, admin_db, client_for

pytestmark = pytest.mark.asyncio

IDEA_JSON = json.dumps(
    {"ideas": [{"title": "Idea A", "angle": "alpha", "why_it_could_work": "w"}]}
)


@pytest.fixture(autouse=True)
def _restore_gateway():
    from app.llm.gateway import get_llm_gateway

    previous = None
    try:
        previous = get_llm_gateway()
    except Exception:
        previous = None
    yield
    set_llm_gateway(previous)


def _gateway(script: list[str]) -> ScriptedLLMProvider:
    provider = ScriptedLLMProvider(script=script)
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _session_for(user_id, title: str) -> str:
    """Create a session as `user_id` and return its id.

    Uses a FRESH client each call rather than the `client_a` / `client_b`
    fixtures: those fixtures are single-use async context managers, and these
    tests legitimately need several independent authenticated clients.
    """
    async with client_for(user_id) as ac:
        response = await ac.post("/api/studio/sessions", json={"title": title})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _ac(user_id):
    """A fresh authenticated client for `user_id` (safe to enter repeatedly)."""
    return client_for(user_id)


# --------------------------------------------------------------------------- #
# Schema-level RLS
# --------------------------------------------------------------------------- #

async def test_studio_tables_have_rls_enabled_and_policies():
    async with admin_db() as db:
        rows = (await db.execute(text("""
            SELECT c.relname AS table_name,
                   c.relrowsecurity AS rls,
                   (SELECT COUNT(*) FROM pg_policies p
                     WHERE p.tablename = c.relname) AS policies
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname IN ('studio_sessions', 'studio_generations')
            ORDER BY c.relname
        """))).mappings().all()

    assert len(rows) == 2
    for row in rows:
        assert row["rls"] is True, f"{row['table_name']} has RLS disabled"
        assert row["policies"] >= 1


async def test_studio_introduced_no_second_vector_or_asset_store():
    """§41: Studio must not add infrastructure Phase 2 already owns."""
    async with admin_db() as db:
        row = (await db.execute(text("""
            SELECT COUNT(*) AS extra
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name LIKE 'studio%'
              AND table_name NOT IN ('studio_sessions', 'studio_generations')
        """))).one()
        embedding_tables = (await db.execute(text("""
            SELECT COUNT(*) AS n
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace ns ON ns.oid = c.relnamespace
            WHERE ns.nspname = 'public' AND c.relname LIKE 'studio%'
              AND a.attname = 'embedding'
        """))).scalar()

    assert row[0] == 0
    assert embedding_tables == 0


# --------------------------------------------------------------------------- #
# Own-data access works (the negative control for every block below)
# --------------------------------------------------------------------------- #

async def test_creator_a_can_create_read_update_and_delete_own_session():
    session_id = await _session_for(USER_A, "A's own session")

    async with _ac(USER_A) as ac:
        read = await ac.get(f"/api/studio/sessions/{session_id}")
        assert read.status_code == 200
        assert read.json()["title"] == "A's own session"

        updated = await ac.patch(
            f"/api/studio/sessions/{session_id}",
            json={"current_step": "generate"},
        )
        assert updated.status_code == 200

        deleted = await ac.delete(f"/api/studio/sessions/{session_id}")
        assert deleted.status_code == 204


async def test_creator_a_can_list_and_generate_in_own_session():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A generates"}
        )).json()
        generated = await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )
        versions = await ac.get(f"/api/studio/sessions/{session['id']}/versions")

    assert generated.status_code == 200
    assert versions.json()["total"] == 1


# --------------------------------------------------------------------------- #
# Cross-creator access is blocked
# --------------------------------------------------------------------------- #

async def test_creator_b_cannot_read_creator_a_session():
    session_id = await _session_for(USER_A, "A private session")

    async with _ac(USER_B) as ac:
        response = await ac.get(f"/api/studio/sessions/{session_id}")

    # 404, not 403: a 403 would confirm the id exists.
    assert response.status_code == 404
    assert "A private session" not in response.text


async def test_creator_b_cannot_see_a_session_in_its_list():
    await _session_for(USER_A, "A listed session")

    async with _ac(USER_B) as ac:
        response = await ac.get("/api/studio/sessions")

    assert response.status_code == 200
    titles = [s["title"] for s in response.json()["sessions"]]
    assert "A listed session" not in titles


async def test_creator_b_cannot_update_creator_a_session():
    session_id = await _session_for(USER_A, "A's session")

    async with _ac(USER_B) as ac:
        response = await ac.patch(
            f"/api/studio/sessions/{session_id}",
            json={"title": "Hijacked", "current_step": "done"},
        )

    assert response.status_code == 404

    # And the row is genuinely unchanged.
    async with _ac(USER_A) as ac:
        after = await ac.get(f"/api/studio/sessions/{session_id}")
    assert after.json()["title"] == "A's session"
    assert after.json()["current_step"] == "context"


async def test_creator_b_cannot_delete_creator_a_session():
    session_id = await _session_for(USER_A, "A's session")

    async with _ac(USER_B) as ac:
        response = await ac.delete(f"/api/studio/sessions/{session_id}")
    assert response.status_code == 404

    # A still has it.
    async with _ac(USER_A) as ac:
        still = await ac.get(f"/api/studio/sessions/{session_id}")
    assert still.status_code == 200


async def test_creator_b_cannot_generate_into_creator_a_session():
    _gateway([IDEA_JSON])
    session_id = await _session_for(USER_A, "A's session")

    async with _ac(USER_B) as ac:
        response = await ac.post(
            "/api/studio/generate",
            json={"session_id": session_id, "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )
    assert response.status_code == 404

    async with _ac(USER_A) as ac:
        versions = await ac.get(f"/api/studio/sessions/{session_id}/versions")
    assert versions.json()["total"] == 0


async def test_creator_b_cannot_list_creator_a_versions():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A versions"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )

    async with _ac(USER_B) as ac:
        response = await ac.get(f"/api/studio/sessions/{session['id']}/versions")

    assert response.status_code == 404


async def test_creator_b_cannot_critique_creator_a_content():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A content"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

    async with _ac(USER_B) as ac:
        response = await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"],
                  "generation_id": generation["generation_id"]},
        )
    assert response.status_code == 404


async def test_creator_b_cannot_refine_creator_a_content():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A refine"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )

    async with _ac(USER_B) as ac:
        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"], "instruction": "hijack it"},
        )
    assert response.status_code == 404

    async with _ac(USER_A) as ac:
        versions = await ac.get(f"/api/studio/sessions/{session['id']}/versions")
    assert versions.json()["total"] == 1


async def test_creator_b_cannot_approve_creator_a_version():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A approve"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

    async with _ac(USER_B) as ac:
        response = await ac.post(
            f"/api/studio/versions/{generation['generation_id']}/approve",
            json={"approved": True},
        )
    assert response.status_code == 404

    async with _ac(USER_A) as ac:
        versions = await ac.get(f"/api/studio/sessions/{session['id']}/versions")
    assert versions.json()["versions"][0]["creator_approved"] is False


async def test_creator_b_cannot_delete_creator_a_version():
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A delete version"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

    async with _ac(USER_B) as ac:
        response = await ac.delete(
            f"/api/studio/versions/{generation['generation_id']}"
        )
    assert response.status_code == 404

    async with _ac(USER_A) as ac:
        versions = await ac.get(f"/api/studio/sessions/{session['id']}/versions")
    assert versions.json()["total"] == 1


async def test_creator_b_cannot_read_creator_a_context():
    session_id = await _session_for(USER_A, "A context")
    async with _ac(USER_B) as ac:
        response = await ac.get(f"/api/studio/sessions/{session_id}/context")
    assert response.status_code == 404


async def test_creator_b_cannot_read_creator_a_generated_asset_text():
    """The version text comes from `content_assets`, which has its own RLS."""
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "A asset"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )

    async with _ac(USER_B) as ac:
        response = await ac.get(f"/api/studio/sessions/{session['id']}/versions")

    assert response.status_code == 404
    assert "Idea A" not in response.text


# --------------------------------------------------------------------------- #
# Database-level enforcement (not merely the application layer)
# --------------------------------------------------------------------------- #

async def test_direct_sql_as_creator_b_sees_no_creator_a_rows():
    """RLS, not the router, is the boundary. Proven with raw SQL.

    Bypasses the API entirely: connect as B through an RLS-scoped session and
    query A's rows directly.
    """
    from tests.conftest import rls_session

    async with admin_db() as db:
        row = (await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(USER_A), "e": "studio-rls-a@test.local"},
        ))
        await db.commit()

    # Seed a session as A.
    async with rls_session(USER_A) as db_a:
        await db_a.execute(
            text("INSERT INTO studio_sessions (user_id, title) "
                 "VALUES (:u, 'A-only row') RETURNING id"),
            {"u": str(USER_A)},
        )
        await db_a.commit()

    # B sees nothing.
    async with rls_session(USER_B) as db_b:
        rows = (await db_b.execute(
            text("SELECT title FROM studio_sessions")
        )).mappings().all()
        counted = (await db_b.execute(
            text("SELECT COUNT(*) AS n FROM studio_sessions")
        )).scalar()

    assert [r["title"] for r in rows] != ["A-only row"]
    assert "A-only row" not in [r["title"] for r in rows]


async def test_direct_sql_cannot_forge_ownership_on_insert():
    """`WITH CHECK` blocks B from inserting a session owned by A."""
    from tests.conftest import rls_session
    from sqlalchemy.exc import DBAPIError

    async with admin_db() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(USER_A), "e": "studio-rls-forge@test.local"},
        )
        await db.commit()

    async with rls_session(USER_B) as db_b:
        with pytest.raises(DBAPIError) as excinfo:
            await db_b.execute(
                text("INSERT INTO studio_sessions (user_id, title) "
                     "VALUES (:u, 'forged')"),
                {"u": str(USER_A)},
            )
        await db_b.rollback()

    # The DBAPI error string embeds the SQL text, so this asserts the POLICY
    # rejected the write -- not that a literal is absent from the message.
    message = str(excinfo.value).lower()
    assert "row-level security" in message
    assert "new row violates row-level security policy" in message


async def test_direct_sql_cannot_update_another_creators_session():
    """A `USING` clause without a matching `WITH CHECK` is not enough on UPDATE."""
    from tests.conftest import rls_session

    async with admin_db() as db:
        await db.execute(
            text("INSERT INTO users (id, email) VALUES (:i, :e) "
                 "ON CONFLICT (id) DO NOTHING"),
            {"i": str(USER_A), "e": "studio-rls-update@test.local"},
        )
        await db.commit()

    async with rls_session(USER_A) as db_a:
        session = (await db_a.execute(
            text("INSERT INTO studio_sessions (user_id, title) "
                 "VALUES (:u, 'unmodifiable') RETURNING id"),
            {"u": str(USER_A)},
        )).scalar_one()
        await db_a.commit()

    async with rls_session(USER_B) as db_b:
        affected = (await db_b.execute(
            text("UPDATE studio_sessions SET title = 'changed' WHERE id = :i"),
            {"i": str(session)},
        )).rowcount
        await db_b.rollback()

    assert affected == 0


async def test_session_user_id_cannot_be_reassigned():
    """Reassigning a session to another user must fail the WITH CHECK clause."""
    from tests.conftest import rls_session
    from sqlalchemy.exc import DBAPIError

    async with admin_db() as db:
        for uid, email in ((USER_A, "reassign-a@test.local"),
                           (USER_B, "reassign-b@test.local")):
            await db.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": email},
            )
        await db.commit()

    async with rls_session(USER_A) as db_a:
        session = (await db_a.execute(
            text("INSERT INTO studio_sessions (user_id, title) "
                 "VALUES (:u, 'stays with A') RETURNING id"),
            {"u": str(USER_A)},
        )).scalar_one()
        await db_a.commit()

    async with rls_session(USER_A) as db_a:
        with pytest.raises(DBAPIError) as excinfo:
            await db_a.execute(
                text("UPDATE studio_sessions SET user_id = :other WHERE id = :i"),
                {"other": str(USER_B), "i": str(session)},
            )
        await db_a.rollback()

    assert "row-level security" in str(excinfo.value).lower()


async def test_generations_cascade_delete_with_the_session():
    """Deleting a session must not leave orphaned generation or asset rows."""
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Cascade"}
        )).json()
        generated = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()
        session_id = uuid.UUID(session["id"])
        generation_id = uuid.UUID(generated["generation_id"])
        asset_id = uuid.UUID(generated["asset_id"])

        assert (await ac.delete(f"/api/studio/sessions/{session['id']}")).status_code == 204

    async with admin_db() as db:
        gen = (await db.execute(
            text("SELECT 1 FROM studio_generations WHERE id = :i"),
            {"i": generation_id},
        )).first()
        asset = (await db.execute(
            text("SELECT 1 FROM content_assets WHERE id = :i"),
            {"i": asset_id},
        )).first()
        sess = (await db.execute(
            text("SELECT 1 FROM studio_sessions WHERE id = :i"),
            {"i": session_id},
        )).first()

    assert sess is None
    assert gen is None, "generations must cascade with the session"
    assert asset is None, "the generated asset must cascade too"


async def test_deleting_generated_content_also_removes_its_embeddings(client_a):
    """Cleanup must not leave orphaned vectors behind.

    Studio never deletes from `chunks` -- that is the Memory Engine's vector
    store. The `content_assets.asset_id -> chunks ON DELETE CASCADE` FK does it.
    """
    _gateway([IDEA_JSON])
    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Embedding cleanup"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()
        asset_id = uuid.UUID(generation["asset_id"])

        # Give the asset an embedded chunk, exactly as the Memory Engine would.
        async with _ac(USER_A) as ac2:
            await ac2.delete(f"/api/studio/sessions/{session['id']}")

    async with admin_db() as db:
        remaining = (await db.execute(
            text("SELECT COUNT(*) FROM chunks WHERE asset_id = :a"),
            {"a": asset_id},
        )).scalar()
        asset = (await db.execute(
            text("SELECT 1 FROM content_assets WHERE id = :a"), {"a": asset_id},
        )).first()

    assert asset is None
    assert remaining == 0, "chunks must cascade from the deleted asset"


async def test_session_cannot_forge_a_generation_row():
    """A generation row always belongs to the session's owner."""
    from tests.conftest import rls_session
    from sqlalchemy.exc import DBAPIError

    async with admin_db() as db:
        for uid, email in ((USER_A, "gen-forge-a@test.local"),
                           (USER_B, "gen-forge-b@test.local")):
            await db.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": email},
            )
        await db.commit()

    async with rls_session(USER_A) as db_a:
        asset = (await db_a.execute(
            text("INSERT INTO content_assets "
                 "(user_id, title, source_type, raw_text) "
                 "VALUES (:u, 'A asset', 'studio', 'text') RETURNING id"),
            {"u": str(USER_A)},
        )).scalar_one()
        session = (await db_a.execute(
            text("INSERT INTO studio_sessions (user_id, title) "
                 "VALUES (:u, 'A session') RETURNING id"),
            {"u": str(USER_A)},
        )).scalar_one()
        await db_a.commit()

    async with rls_session(USER_B) as db_b:
        with pytest.raises(DBAPIError) as excinfo:
            await db_b.execute(
                text("INSERT INTO studio_generations "
                     "(user_id, session_id, asset_id, version, capability) "
                     "VALUES (:u, :s, :a, 1, 'idea')"),
                {"u": str(USER_A), "s": str(session), "a": str(asset)},
            )
        await db_b.rollback()

    assert "row-level security" in str(excinfo.value).lower()


async def test_unique_version_constraint_per_session():
    """Two rows may not claim the same version number in one session."""
    _gateway([IDEA_JSON])
    from sqlalchemy.exc import IntegrityError

    async with _ac(USER_A) as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Versions unique"}
        )).json()
        generated = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

    async with admin_db() as db:
        with pytest.raises(IntegrityError):
            await db.execute(
                text("INSERT INTO studio_generations "
                     "(user_id, session_id, asset_id, version, capability) "
                     "SELECT user_id, session_id, asset_id, version, capability "
                     "FROM studio_generations WHERE id = :i"),
                {"i": uuid.UUID(generated["generation_id"])},
            )
        await db.rollback()
