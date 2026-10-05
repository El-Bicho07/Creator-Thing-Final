import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# --- operational (RLS-bypassing) engine -------------------------------------
# Used only by offline tooling that must span all creators: schema migrations,
# re-embedding and provenance reconciliation. Never used to serve a request.
admin_engine = None
admin_session_maker = None

if settings.admin_database_url:
    admin_engine = create_async_engine(
        settings.admin_database_url,
        echo=False,
        pool_pre_ping=True,
    )
    admin_session_maker = async_sessionmaker(
        admin_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# RLS-scoped session
# ---------------------------------------------------------------------------
#
# PostgreSQL carries the authenticated identity in a session variable,
# `request.jwt.claims`, which the RLS policies read through `current_user_id()`.
#
# The subtle part is connection affinity. `set_config(..., is_local => false)`
# only survives while the SAME physical connection is in use. If the identity is
# set on a pooled session, the first `commit()` returns that connection to the
# pool; the next statement may check out a *different* connection with no claims,
# and `current_user_id()` falls back to the zero UUID -- which makes RLS silently
# return zero rows for a legitimate creator.
#
# `SET LOCAL` has the mirror-image problem: it is discarded at every COMMIT.
#
# So an RLS-scoped session pins ONE connection for its whole lifetime, sets the
# claims on it, and clears them before releasing it. Clearing matters: without
# it, the next request handed the same pooled connection would inherit the
# previous creator's identity.

_SET_CLAIMS = text("SELECT set_config('request.jwt.claims', :claims, false)")
_CLEAR_CLAIMS = text("SELECT set_config('request.jwt.claims', '', false)")


@asynccontextmanager
async def rls_scoped_session(claims: dict) -> AsyncGenerator[AsyncSession, None]:
    """Yield an `AsyncSession` bound to one connection carrying `claims`."""
    connection = await engine.connect()
    try:
        await connection.execute(_SET_CLAIMS, {"claims": json.dumps(claims)})
        await connection.commit()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            try:
                await connection.execute(_CLEAR_CLAIMS)
                await connection.commit()
            except Exception:  # pragma: no cover - defensive
                logger.warning("Failed to clear RLS claims before releasing connection")
    finally:
        await connection.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)