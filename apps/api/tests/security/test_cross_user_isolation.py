"""Cross-user isolation security tests (HTTP-facing).

Each test proves that PostgreSQL Row Level Security -- not application code --
prevents one creator from touching another's rows. All of them run against the
real database with RLS enabled.

Two defects in the original Phase 1 version of this file were fixed during Phase 2:

* `SET LOCAL request.jwt.claims` is TRANSACTION-scoped, so the identity was
  discarded at every COMMIT and RLS silently reverted to the zero UUID. Session
  scope is used instead, and the claims are bound as a parameter rather than
  string-interpolated.
* The setup fixture inserted test users through an RLS-scoped application
  session. Inserting into `users` is itself subject to the `user_self_access`
  policy, so PostgreSQL correctly rejected it. User bootstrap and data reset are
  now handled by the privileged autouse fixtures in `tests/conftest.py`.

`chunks.embedding` has been `vector(768)` since migration 004, so fixtures embed
real 768-dimensional vectors.
"""
import json
import math
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.auth import get_current_user, get_db_with_user
from app.core.config import settings
from app.core.db import rls_scoped_session
from app.main import app

TEST_DATABASE_URL = settings.database_url

# Pooling is disabled: pytest-asyncio 0.24 runs fixtures and tests on different
# event loops, and a pooled connection belongs to the loop that opened it.
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

USER_A_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

#: A unit 768-dimensional vector, matching the production column width.
UNIT_VECTOR_768 = "[" + ",".join([f"{1 / math.sqrt(768):.10f}"] * 768) + "]"


async def create_jwt_claims(user_id: uuid.UUID) -> str:
    """Mock JWT claims, shaped like a real Supabase token payload."""
    return json.dumps({
        "sub": str(user_id),
        "aud": "authenticated",
        "role": "authenticated",
        "email": f"{str(user_id)[:8]}@test.com",
    })


class TestCrossUserIsolation:
    """RLS prevents cross-user data access."""

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self):
        """No-op: bootstrap and reset are handled by conftest autouse fixtures.

        They must run with the privileged admin role, because creating users and
        seeding rows as the unprivileged application role is itself blocked by
        RLS -- which is exactly the behaviour under test.
        """
        yield

    async def _execute_as_user(self, db: AsyncSession, user_id: uuid.UUID,
                               query: str, params: dict | None = None):
        """Execute a statement under `user_id`'s RLS identity."""
        claims = await create_jwt_claims(user_id)
        # Session scope, bound as a parameter (never interpolated).
        await db.execute(
            text("SELECT set_config('request.jwt.claims', :claims, false)"),
            {"claims": claims},
        )
        return await db.execute(text(query), params or {})

    # ------------------------------------------------------------------ #

    async def test_user_a_can_access_own_data(self):
        """User A can read their own row."""
        async with TestAsyncSessionLocal() as db:
            await self._execute_as_user(db, USER_A_ID, """
                INSERT INTO creator_profiles
                    (id, user_id, full_name, niche, target_audience,
                     primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User A', 'Tech',
                        'Developers', 'YouTube', '[]')
            """, {"user_id": USER_A_ID})
            await db.commit()

            result = await self._execute_as_user(db, USER_A_ID, """
                SELECT full_name FROM creator_profiles WHERE user_id = :user_id
            """, {"user_id": USER_A_ID})
            rows = result.fetchall()
            assert len(rows) == 1, "User A must see their own profile"
            assert rows[0].full_name == "User A"

    async def test_user_a_cannot_read_user_b_data(self):
        """User A cannot read User B's profile."""
        async with TestAsyncSessionLocal() as db:
            await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO creator_profiles
                    (id, user_id, full_name, niche, target_audience,
                     primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User B', 'Fitness',
                        'Athletes', 'Instagram', '[]')
            """, {"user_id": USER_B_ID})
            await db.commit()

            result = await self._execute_as_user(db, USER_A_ID, """
                SELECT * FROM creator_profiles WHERE user_id = :user_id
            """, {"user_id": USER_B_ID})
            assert result.fetchall() == [], "User A must not see User B's profile"

    async def test_user_a_cannot_update_user_b_data(self):
        """User A cannot modify User B's profile."""
        async with TestAsyncSessionLocal() as db:
            result = await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO creator_profiles
                    (id, user_id, full_name, niche, target_audience,
                     primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User B', 'Fitness',
                        'Athletes', 'Instagram', '[]')
                RETURNING id
            """, {"user_id": USER_B_ID})
            profile_id = result.first()[0]
            await db.commit()

            await self._execute_as_user(db, USER_A_ID, """
                UPDATE creator_profiles SET full_name = 'Hacked' WHERE id = :id
            """, {"id": profile_id})
            await db.commit()

            result = await self._execute_as_user(db, USER_B_ID, """
                SELECT full_name FROM creator_profiles WHERE id = :id
            """, {"id": profile_id})
            assert result.first()[0] == "User B", "User A modified User B's data"

    async def test_user_a_cannot_delete_user_b_data(self):
        """User A cannot delete User B's profile."""
        async with TestAsyncSessionLocal() as db:
            result = await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO creator_profiles
                    (id, user_id, full_name, niche, target_audience,
                     primary_platform, content_goals)
                VALUES (gen_random_uuid(), :user_id, 'User B', 'Fitness',
                        'Athletes', 'Instagram', '[]')
                RETURNING id
            """, {"user_id": USER_B_ID})
            profile_id = result.first()[0]
            await db.commit()

            await self._execute_as_user(db, USER_A_ID, """
                DELETE FROM creator_profiles WHERE id = :id
            """, {"id": profile_id})
            await db.commit()

            result = await self._execute_as_user(db, USER_B_ID, """
                SELECT id FROM creator_profiles WHERE id = :id
            """, {"id": profile_id})
            assert result.fetchall(), "User A deleted User B's profile"

    async def test_user_a_cannot_access_user_b_embeddings(self):
        """User A cannot retrieve User B's chunks (768-d vectors)."""
        async with TestAsyncSessionLocal() as db:
            result = await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO content_assets
                    (id, user_id, title, source_type, raw_text)
                VALUES (gen_random_uuid(), :user_id, 'Test Video', 'youtube',
                        'Test content')
                RETURNING id
            """, {"user_id": USER_B_ID})
            asset_id = result.first()[0]

            await self._execute_as_user(db, USER_B_ID, f"""
                INSERT INTO chunks
                    (id, user_id, asset_id, chunk_index, chunk_text, embedding,
                     embedding_model, embedding_dimension)
                VALUES (gen_random_uuid(), :user_id, :asset_id, 0, 'Test chunk',
                        '{UNIT_VECTOR_768}'::vector,
                        'intfloat/multilingual-e5-base', 768)
            """, {"user_id": USER_B_ID, "asset_id": asset_id})
            await db.commit()

            result = await self._execute_as_user(db, USER_A_ID, """
                SELECT * FROM chunks WHERE user_id = :user_id
            """, {"user_id": USER_B_ID})
            assert result.fetchall() == [], "User A must not see User B's vectors"

    async def test_user_a_cannot_access_user_b_jobs(self):
        """User A cannot see User B's jobs."""
        async with TestAsyncSessionLocal() as db:
            await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO jobs (id, user_id, job_type, status, progress, total)
                VALUES (gen_random_uuid(), :user_id, 'ingest', 'processing', 50, 100)
            """, {"user_id": USER_B_ID})
            await db.commit()

            result = await self._execute_as_user(db, USER_A_ID, """
                SELECT * FROM jobs WHERE user_id = :user_id
            """, {"user_id": USER_B_ID})
            assert result.fetchall() == [], "User A must not see User B's jobs"

    async def test_user_a_cannot_access_user_b_ai_calls(self):
        """User A cannot see User B's AI usage records."""
        async with TestAsyncSessionLocal() as db:
            await self._execute_as_user(db, USER_B_ID, """
                INSERT INTO ai_calls
                    (id, user_id, feature, provider, model, prompt_version,
                     input_tokens, output_tokens, latency_ms, success)
                VALUES (gen_random_uuid(), :user_id, 'test', 'mock', 'm', 'v1',
                        10, 20, 5, TRUE)
            """, {"user_id": USER_B_ID})
            await db.commit()

            result = await self._execute_as_user(db, USER_A_ID, """
                SELECT * FROM ai_calls WHERE user_id = :user_id
            """, {"user_id": USER_B_ID})
            assert result.fetchall() == [], "User A must not see User B's ai_calls"

    # ------------------------------------------------------------------ #
    # Schema-level RLS invariants
    # ------------------------------------------------------------------ #

    async def test_all_tables_have_rls_enabled(self):
        async with TestAsyncSessionLocal() as db:
            rows = (await db.execute(text("""
                SELECT tablename, rowsecurity FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename IN (
                    'users','creator_profiles','voice_profiles','content_assets',
                    'chunks','ideas','plan_items','performance_records',
                    'comments','comment_insights','lessons','jobs','ai_calls')
                ORDER BY tablename
            """))).fetchall()
            assert len(rows) == 13, f"expected 13 tables, found {len(rows)}"
            for table, enabled in rows:
                assert enabled, f"RLS not enabled on {table}"

    async def test_all_tables_have_rls_policies(self):
        async with TestAsyncSessionLocal() as db:
            rows = (await db.execute(text("""
                SELECT tablename, policyname FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename IN (
                    'users','creator_profiles','voice_profiles','content_assets',
                    'chunks','ideas','plan_items','performance_records',
                    'comments','comment_insights','lessons','jobs','ai_calls')
                ORDER BY tablename
            """))).fetchall()
            assert len(rows) == 13, f"expected 13 policies, found {len(rows)}"

    # ------------------------------------------------------------------ #
    # HTTP authentication must fail closed
    # ------------------------------------------------------------------ #

    async def test_unauthenticated_request_rejected(self):
        """No token -> 401, and no data leaks."""
        from app.core.auth import get_db_with_user as _unused  # noqa: F401
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            for path in ("/api/memory/stats", "/api/voice/profile",
                         "/api/voice/profiles"):
                response = await ac.get(path)
                assert response.status_code in (401, 403), \
                    f"{path} returned {response.status_code} without a token"

    async def test_invalid_token_rejected(self):
        """A structurally invalid bearer token must be refused."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(
                "/api/memory/stats",
                headers={"Authorization": "Bearer not-a-real-jwt"},
            )
            assert response.status_code in (401, 403)