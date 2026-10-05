"""Connection / session identity verification (task §5).

The original Phase 1 defect used `SET LOCAL`, which is TRANSACTION-scoped. The
identity therefore vanished at every COMMIT and `current_user_id()` fell back to
the zero UUID, so RLS silently hid *all* of the creator's own rows.

These tests are regression tests for exactly that, plus the mirror-image bug that
the naive fix introduces: a session-scope setting that survives on a pooled
connection, letting the next request inherit the previous creator's identity.

Covered:

  * identity is visible AFTER a commit (the `SET LOCAL` regression)
  * A -> B -> A sequence yields the correct identity each time
  * a pooled connection reused by a later request carries no stale identity
  * `request.jwt.claims` is cleared before a connection is released
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.db import rls_scoped_session

pytestmark = pytest.mark.asyncio

USER_A = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
USER_B = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
ZERO_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")

_CLAIMS_SQL = text("SELECT current_user_id()")


async def _ensure_users() -> None:
    engine = create_async_engine(settings.admin_database_url, echo=False,
                                 poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as admin:
        for uid in (USER_A, USER_B):
            await admin.execute(
                text("INSERT INTO users (id, email) VALUES (:i, :e) "
                     "ON CONFLICT (id) DO NOTHING"),
                {"i": str(uid), "e": f"{uid.hex[:8]}@identity.test"})
        await admin.commit()
    await engine.dispose()


# --------------------------------------------------------------------------- #
# The core regression: identity must survive COMMIT
# --------------------------------------------------------------------------- #

async def test_identity_survives_commit_set_local_regression():
    """A `SET LOCAL` implementation would fail this immediately.

    `SET LOCAL` is discarded at COMMIT, so after the first commit the identity
    would read back as the zero UUID.
    """
    await _ensure_users()

    async with rls_scoped_session({"sub": str(USER_A)}) as db:
        before = (await db.execute(_CLAIMS_SQL)).scalar()
        assert before == USER_A, "identity must be set before the first statement"

        await db.commit()

        after = (await db.execute(_CLAIMS_SQL)).scalar()
        assert after == USER_A, (
            "RLS identity was lost after COMMIT -- this is the SET LOCAL bug"
        )
        assert after != ZERO_UUID

        # Multiple commits in one request must all retain the identity.
        for _ in range(3):
            await db.commit()
            assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A


async def test_claims_setting_is_session_scoped_not_transaction_local():
    """Contrast session scope against `SET LOCAL` on a single pinned connection.

    A `Session` may release its connection between statements, so the contrast
    is only meaningful on one explicitly held `Connection` where affinity is
    guaranteed.
    """
    engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    async with engine.connect() as connection:
        # Session scope: survives COMMIT.
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, false)"),
            {"c": json.dumps({"sub": str(USER_A)})})
        await connection.commit()
        assert (await connection.execute(_CLAIMS_SQL)).scalar() == USER_A

        # Transaction scope: visible inside the transaction, gone after COMMIT.
        # `set_config(..., is_local => true)` is the parameterised equivalent of
        # `SET LOCAL`. Plain `SET`/`SET LOCAL` cannot take a bind parameter, which
        # is exactly why the production code uses `set_config` with a bound value.
        await connection.execute(
            text("SELECT set_config('request.jwt.claims', :c, true)"),
            {"c": json.dumps({"sub": str(USER_B)})})
        assert (await connection.execute(_CLAIMS_SQL)).scalar() == USER_B
        await connection.commit()
        assert (await connection.execute(_CLAIMS_SQL)).scalar() == USER_A, \
            "a transaction-scoped setting must revert at COMMIT"
    await engine.dispose()


# --------------------------------------------------------------------------- #
# A -> B -> A ordering (task §5)
# --------------------------------------------------------------------------- #

async def test_alternating_identities_a_b_a():
    """A -> B -> A must produce exactly that identity, every time."""
    await _ensure_users()
    order = [USER_A, USER_B, USER_A, USER_B, USER_A]
    for expected in order:
        async with rls_scoped_session({"sub": str(expected)}) as db:
            actual = (await db.execute(_CLAIMS_SQL)).scalar()
            assert actual == expected, (
                f"expected identity {expected}, got {actual} -- identity bleed"
            )
            await db.commit()
            assert (await db.execute(_CLAIMS_SQL)).scalar() == expected


async def test_identity_is_stable_across_many_statements():
    """A long request with interleaved reads/writes keeps one identity."""
    await _ensure_users()

    async with rls_scoped_session({"sub": str(USER_A)}) as db:
        for i in range(25):
            assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A
            await db.execute(text("SELECT 1"))
            if i % 5 == 0:
                await db.commit()
        await db.commit()
        assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A


# --------------------------------------------------------------------------- #
# Pooled-connection reuse (task §5)
# --------------------------------------------------------------------------- #

async def test_pooled_connection_is_not_reused_with_stale_identity():
    """After a scoped session ends, the connection must carry no identity.

    Uses a real pooled engine (the production one) so a connection is very
    likely to be handed straight back out and reused -- which is the condition
    under which a session-scope setting leaks.
    """
    from app.core.db import engine as production_engine

    async with rls_scoped_session({"sub": str(USER_A)}) as db:
        assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A
        await db.commit()

    # Force reuse of pooled connections and assert none carries an identity.
    for _ in range(5):
        async with production_engine.connect() as connection:
            observed = (await connection.execute(_CLAIMS_SQL)).scalar()
            assert observed == ZERO_UUID, (
                f"a pooled connection still carried identity {observed} after the "
                "request ended -- cross-user identity leak"
            )


async def test_consecutive_scoped_sessions_do_not_share_identity():
    """Many alternating sessions on the production pooled engine."""
    await _ensure_users()

    for round_index in range(6):
        expected = USER_A if round_index % 2 == 0 else USER_B
        async with rls_scoped_session({"sub": str(expected)}) as db:
            assert (await db.execute(_CLAIMS_SQL)).scalar() == expected
            await db.commit()
            assert (await db.execute(_CLAIMS_SQL)).scalar() == expected


async def test_identity_cleared_on_the_very_connection_that_carried_it():
    """Negative control: inspect the ACTUAL connection that carried the identity.

    Checking a newly-checked-out connection cannot detect a leak -- the stale
    claim sits on the connection the request used, and a multi-connection pool may
    hand out a different one. This drives the PRODUCTION `rls_scoped_session`
    against a single-connection pool, so the connection that carried the
    identity is necessarily the one inspected afterwards.
    """
    import app.core.db as core_db

    await _ensure_users()

    original = core_db.engine
    single = create_async_engine(settings.database_url, echo=False,
                                pool_size=1, max_overflow=0)
    core_db.engine = single  # rls_scoped_session resolves this global at call time
    try:
        async with rls_scoped_session({"sub": str(USER_A)}) as db:
            assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A
            await db.commit()
            assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_A

        # The pool owns exactly one connection: the one just released.
        async with single.connect() as reused:
            observed = (await reused.execute(_CLAIMS_SQL)).scalar()
            assert observed == ZERO_UUID, (
                "the connection that carried User A's identity still carries it "
                "after release -- cross-user identity leak"
            )
    finally:
        core_db.engine = original
        await single.dispose()


async def test_claims_are_cleared_on_scope_exit():
    """Even if the body raises, the identity must not survive the connection."""
    await _ensure_users()

    with pytest.raises(RuntimeError):
        async with rls_scoped_session({"sub": str(USER_B)}) as db:
            assert (await db.execute(_CLAIMS_SQL)).scalar() == USER_B
            await db.commit()
            raise RuntimeError("simulated handler failure")

    from app.core.db import engine as production_engine
    async with production_engine.connect() as connection:
        assert (await connection.execute(_CLAIMS_SQL)).scalar() == ZERO_UUID