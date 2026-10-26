"""
First-request user provisioning, and the isolation it must not cost.

Supabase Auth owns identity in `auth.users`; this database keeps its own `users`
table and every feature table carries `REFERENCES users(id)`. A creator who has
just signed up therefore has no `users` row, and without provisioning the first
write fails on the foreign key -- a 409 that looks like a conflict but is a
missing identity.

These tests pin three things at once, because the naive fix (insert with the
admin connection, or trust a client-supplied id) would buy the first at the cost
of the other two:

  1. a brand-new authenticated creator can write immediately;
  2. provisioning is idempotent, so it is safe on every request;
  3. RLS still refuses to let one creator provision a row for another.

`get_db_with_user` is exercised directly rather than through the HTTP client
fixtures, because those fixtures *override* the auth dependency -- which is
exactly the code under test here.
"""

import uuid

import pytest
from sqlalchemy import text

from app.core.auth import get_db_with_user
from app.core.config import settings
from app.core.db import admin_session_maker


class _FakeRequest:
    """Minimal Request stand-in: the dependency reads `state.jwt_payload`."""

    def __init__(self, user_id: uuid.UUID, email: str) -> None:
        self.state = type("State", (), {})()
        self.state.jwt_payload = {
            "sub": str(user_id),
            "aud": "authenticated",
            "role": "authenticated",
            "email": email,
        }


async def _delete_users(*ids: uuid.UUID) -> None:
    async with admin_session_maker() as admin:
        await admin.execute(
            text("DELETE FROM users WHERE id = ANY(CAST(:ids AS uuid[]))"),
            {"ids": [str(i) for i in ids]},
        )
        await admin.commit()


async def _exists(user_id: uuid.UUID) -> bool:
    async with admin_session_maker() as admin:
        found = await admin.execute(
            text("SELECT 1 FROM users WHERE id = :i"), {"i": str(user_id)}
        )
        return found.scalar_one_or_none() is not None


@pytest.fixture
def fresh_user():
    """A user id with no `users` row, removed again after the test."""
    uid = uuid.uuid4()
    yield uid
    import asyncio

    asyncio.get_event_loop().run_until_complete(_delete_users(uid))


class TestFirstRequestProvisioning:
    async def test_new_creator_gets_a_users_row_on_first_request(self, fresh_user):
        request = _FakeRequest(fresh_user, "fresh-creator@provisioning.test")

        agen = get_db_with_user(request, str(fresh_user))
        session = await agen.__anext__()
        try:
            assert (await _exists(fresh_user)) is True
        finally:
            with pytest.raises(StopAsyncIteration):
                await agen.__anext__()

    async def test_provisioning_is_idempotent_across_requests(self, fresh_user):
        for _ in range(3):
            request = _FakeRequest(fresh_user, "repeat@provisioning.test")
            agen = get_db_with_user(request, str(fresh_user))
            await agen.__anext__()
            with pytest.raises(StopAsyncIteration):
                await agen.__anext__()
        assert (await _exists(fresh_user)) is True

    async def test_email_comes_from_the_verified_claims(self, fresh_user):
        request = _FakeRequest(fresh_user, "claims-email@provisioning.test")
        agen = get_db_with_user(request, str(fresh_user))
        await agen.__anext__()
        with pytest.raises(StopAsyncIteration):
            await agen.__anext__()

        async with admin_session_maker() as admin:
            row = (
                await admin.execute(
                    text("SELECT email FROM users WHERE id = :i"),
                    {"i": str(fresh_user)},
                )
            ).scalar_one()
        assert row == "claims-email@provisioning.test"


class TestProvisioningDoesNotWeakenRLS:
    async def test_creator_cannot_provision_a_row_for_another_creator(self):
        """The victim's row must be refused on the ATTACKER's connection.

        Attempting the insert on the admin connection would prove nothing: the
        admin role bypasses RLS by design. The insert has to be issued by the
        attacker's own `api_user` session, where the policy is actually consulted.
        """
        from app.core.db import rls_scoped_session

        attacker = uuid.uuid4()
        victim = uuid.uuid4()
        claims = {
            "sub": str(attacker),
            "aud": "authenticated",
            "role": "authenticated",
            "email": "attacker@provisioning.test",
        }

        try:
            async with rls_scoped_session(claims) as session:
                await session.execute(
                    text("INSERT INTO users (id, email) VALUES (:i, :e)"),
                    {"i": str(victim), "e": "victim@provisioning.test"},
                )
                await session.commit()
        except Exception as exc:  # noqa: BLE001 - any refusal is acceptable
            assert "row-level security" in str(exc).lower(), exc
        else:
            pytest.fail("provisioning escaped RLS: one creator created another's row")

        assert (await _exists(victim)) is False
        await _delete_users(attacker, victim)

    async def test_api_connection_cannot_bypass_rls(self):
        """The provisioning statement must run as `api_user`, never as the owner.

        If the app ever started provisioning through `admin_database_url` the
        `WITH CHECK (current_user_id() = id)` policy would no longer be consulted,
        and the test above would pass for the wrong reason.
        """
        assert settings.admin_database_url != settings.database_url
        async with admin_session_maker() as admin:
            role = (await admin.execute(text("SELECT current_user"))).scalar_one()
        assert role != "api_user"