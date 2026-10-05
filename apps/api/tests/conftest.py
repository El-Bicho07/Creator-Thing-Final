"""Shared test fixtures.

Tests run against the real development database with RLS enabled, because RLS is
the platform's authorization boundary and a mocked DB would not exercise it.

Authentication note
-------------------
`SUPABASE_URL` is not configured in development, so a real Supabase JWT cannot be
minted here. Tests therefore override the auth dependency while keeping the
**real** RLS-scoped database session. That means these tests prove ownership and
row-level isolation, not JWT signature verification (which requires Supabase and
is covered by the fail-closed check in `tests/security/`).
"""
import asyncio
import json
import uuid
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from fastapi import HTTPException, Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.config import settings
from app.core.db import Base, rls_scoped_session
from app.main import app

# Quieter engine for tests regardless of APP_ENV.
settings.app_env = "test"

import app.core.db as core_db  # noqa: E402  (after settings tweak)

# ---------------------------------------------------------------------------
# Replace the application engine with a NullPool engine for the whole test run.
#
# `rls_scoped_session` reads the module global `engine` at call time, so
# reassigning it here is enough -- and it leaves production code untouched.
#
# Pooling must be disabled under pytest: pytest-asyncio 0.24 runs async fixtures
# and async tests on different event loops, while a pooled connection belongs to
# whichever loop opened it. Reusing it elsewhere raises "another operation is in
# progress" / "got Future attached to a different loop".
# ---------------------------------------------------------------------------
import app.core.db as _core_db
import app.llm.usage as _usage_mod

_test_engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
_test_maker = async_sessionmaker(_test_engine, class_=AsyncSession, expire_on_commit=False)

_core_db.engine = _test_engine
_core_db.async_session_maker = _test_maker
# `usage.py` captured the original factory at import time.
_usage_mod.async_session_maker = _test_maker

# The admin (RLS-bypassing) engine is pooled too, so it has the same
# cross-loop hazard. Replace its session factory as well; several verification
# tests read production vector state through it.
if settings.admin_database_url:
    _test_admin_engine = create_async_engine(
        settings.admin_database_url, echo=False, poolclass=NullPool)
    _core_db.admin_engine = _test_admin_engine
    _core_db.admin_session_maker = async_sessionmaker(
        _test_admin_engine, class_=AsyncSession, expire_on_commit=False)

# Tests get a private engine per session. Pooling is actively harmful here:
# asyncpg connections are bound to the event loop that opened them, so a pooled
# connection reused under a different loop fails with "got Future attached to a
# different loop" / "another operation is in progress". A per-session engine is
# slower but fully deterministic, which is what a security test needs.

USER_A = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


# NOTE ON EVENT LOOPS
# --------------------
# pytest-asyncio 0.24 runs async *fixtures* and async *tests* on DIFFERENT event
# loops (`asyncio_default_test_loop_scope` does not exist in 0.24, and an
# overridden `event_loop` fixture is ignored in auto mode). A connection created
# inside a fixture is therefore unusable from the test body, which surfaces as
# "another operation is in progress" / "got Future attached to a different loop".
#
# The fix used throughout this suite: fixtures are SYNC and return an async
# context manager. The connection is then created inside the test's own loop.
# See `rls_session` and the `session_a` / `client_a` fixtures below.


@pytest.fixture(scope="session", autouse=True)
def test_db_setup():
    """Placeholder marker; creators are bootstrapped lazily per test session.

    Kept as a no-op autouse fixture so tests can still declare a dependency on
    database setup, without holding a cross-loop connection.
    """
    return None


_USERS_READY = False


async def _ensure_test_users() -> None:
    """Ensure the two test creators exist (once per process, own engine)."""
    global _USERS_READY
    if _USERS_READY or not settings.admin_database_url:
        return
    _USERS_READY = True
    engine = create_async_engine(
        settings.admin_database_url, echo=False, poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        for uid in (USER_A, USER_B):
            await admin.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": f"{uid.hex[:8]}@test.local"},
            )
        await admin.commit()
    await engine.dispose()
    # Bootstrap with a privileged session: the test creators must exist, and the
    # application role cannot insert them because RLS has no JWT context yet.
    if settings.admin_database_url:
        admin_engine = create_async_engine(
            settings.admin_database_url, echo=False, poolclass=NullPool)
        admin_session_maker = async_sessionmaker(
            admin_engine, class_=AsyncSession, expire_on_commit=False)
        async with admin_session_maker() as admin:
            for uid in (USER_A, USER_B):
                await admin.execute(
                    text(
                        "INSERT INTO users (id, email) VALUES (:i, :e) "
                        "ON CONFLICT (id) DO NOTHING"
                    ),
                    {"i": str(uid), "e": f"{uid.hex[:8]}@test.local"},
                )
            await admin.commit()
        await admin_engine.dispose()


@asynccontextmanager
async def rls_session(user_id: uuid.UUID):
    """A session carrying `user_id` as the PostgreSQL RLS identity.

    Delegates to the PRODUCTION helper `app.core.db.rls_scoped_session`, so the
    tests exercise the real connection-pinning and claims-reset behaviour rather
    than a test-only approximation.
    """
    async with rls_scoped_session({"sub": str(user_id)}) as session:
        yield session


# Tables a security test may seed. Ordered so that dependents (chunks) are
# removed before their parents (content_assets).
_TEST_TABLES = [
    "chunks", "content_assets", "creator_profiles", "voice_profiles",
    "ideas", "plan_items", "performance_records", "comments",
    "comment_insights", "lessons", "jobs", "ai_calls",
]


@asynccontextmanager
async def admin_db():
    """Privileged session that bypasses RLS.

    Used only for test SETUP and CLEANUP. Real users' rows already exist by the
    time an RLS assertion runs; creating them with the unprivileged application
    role would itself be blocked by RLS.
    """
    engine = create_async_engine(
        settings.admin_database_url, echo=False, poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    session = maker()
    try:
        yield session
    finally:
        await session.close()
        await engine.dispose()


@pytest.fixture(autouse=True)
async def reset_test_data():
    """Clear both test creators' rows before every test.

    Without this, data seeded by an earlier test leaks into the next one and RLS
    correctly hides it, producing confusing failures. The security tests' own
    cleanup cannot do this job: a session scoped to user A can only delete user
    A's rows.
    """
    await _ensure_test_users()
    if settings.admin_database_url:
        async with admin_db() as admin:
            for table in _TEST_TABLES:
                await admin.execute(
                    text(
                        f"DELETE FROM {table} WHERE user_id = ANY(CAST(:ids AS uuid[]))"
                    ),
                    {"ids": [str(USER_A), str(USER_B)]},
                )
            await admin.commit()


@pytest.fixture
def session_a():
    """Async context manager yielding a session scoped to creator A.

    Sync fixture on purpose: the session must be created inside the test's loop.
    Usage:  async with session_a as session: ...
    """
    return rls_session(USER_A)


@pytest.fixture
def session_b():
    """Async context manager yielding a session scoped to creator B."""
    return rls_session(USER_B)


# ---------------------------------------------------------------------------
# Authenticated HTTP clients
# ---------------------------------------------------------------------------
#
# `app.dependency_overrides` is a single global mapping, so overriding it per
# client would make two clients in one test impossible: the last override wins
# for BOTH clients, and user A's requests would silently execute as user B.
#
# Instead one override is installed once, and it resolves the caller from a
# per-request header. Two clients can then coexist and isolation assertions are
# meaningful.

TEST_USER_HEADER = "x-test-user-id"


async def _override_current_user(request: Request) -> CurrentUser:
    raw = request.headers.get(TEST_USER_HEADER)
    if not raw:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    return CurrentUser(raw)


async def _override_db(request: Request):
    async with rls_session(uuid.UUID(request.headers[TEST_USER_HEADER])) as session:
        yield session


app.dependency_overrides[get_current_user] = _override_current_user
app.dependency_overrides[get_db_with_user] = _override_db


def _client_for(user_id: uuid.UUID) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={TEST_USER_HEADER: str(user_id)},
    )


@asynccontextmanager
async def client_for(user_id: uuid.UUID):
    """HTTP client authenticated as `user_id`, over a real RLS-scoped session."""
    async with _client_for(user_id) as ac:
        yield ac


@pytest.fixture
def client_a():
    """Async context manager yielding an authenticated HTTP client for creator A."""
    return client_for(USER_A)


@pytest.fixture
def client_b():
    """Async context manager yielding an authenticated HTTP client for creator B."""
    return client_for(USER_B)


@pytest.fixture
def user_a_id() -> uuid.UUID:
    return USER_A


@pytest.fixture
def user_b_id() -> uuid.UUID:
    return USER_B