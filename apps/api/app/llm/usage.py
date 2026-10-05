"""AI usage, cost and latency accounting.

Writes one row per gateway call to the `ai_calls` table (created in migration
002).

Why a dedicated session
-----------------------
Usage bookkeeping must not be entangled with the caller's transaction:

* a savepoint alone is NOT durable -- releasing it leaves the row inside the
  caller's still-open transaction, so it is lost when that session closes;
* committing the caller's session from here would commit partial feature work.

So each usage row is written on its own short-lived session, with
`request.jwt.claims` set to the same identity the request already carries. RLS
therefore evaluates the insert exactly as it evaluates the caller's own writes:
the row is attributed to the authenticated creator and to nobody else.

Privacy: no API keys, tokens or passwords are recorded. Prompt bodies are not
stored -- only identifiers, counts and timings. `error` is scrubbed of anything
credential-shaped and truncated.

Recording is fail-soft: a logging failure must never turn a successful AI call
into a failed request.
"""
from __future__ import annotations

import json
import re
import uuid
from typing import Optional

from sqlalchemy import text

from app.core.db import async_session_maker
from app.core.logging import get_logger
from app.llm.contracts import LLMResponse

logger = get_logger(__name__)

_SECRET_RE = re.compile(
    r"(sk-[A-Za-z0-9]{8,}"
    r"|[A-Za-z0-9_\-]*API_KEY[\"'\s:=]+[A-Za-z0-9_\-]{8,}"
    r"|eyJ[A-Za-z0-9_\-]{10,}"
    r"|Bearer\s+[A-Za-z0-9._\-]{10,})"
)


def scrub(text: str | None, limit: int = 500) -> Optional[str]:
    """Strip credential-looking substrings and truncate."""
    if not text:
        return None
    cleaned = _SECRET_RE.sub("[redacted]", str(text))
    return cleaned[:limit]


async def _with_identity(user_id: uuid.UUID):
    """Session carrying the caller's RLS identity."""
    session = async_session_maker()
    await session.execute(
        text("SELECT set_config('request.jwt.claims', :claims, false)"),
        {"claims": json.dumps({"sub": str(user_id)})},
    )
    return session


async def record_usage(
    *,
    user_id: uuid.UUID,
    feature: str,
    prompt_version: str,
    response: LLMResponse,
) -> None:
    """Persist one `ai_calls` row on an independent session. Never raises."""
    session = None
    try:
        session = await _with_identity(user_id)
        await session.execute(
            text(
                """
                INSERT INTO ai_calls (
                    user_id, feature, provider, model, prompt_version,
                    input_tokens, output_tokens, estimated_cost,
                    latency_ms, success, error_message
                )
                VALUES (
                    :user_id, :feature, :provider, :model, :prompt_version,
                    :input_tokens, :output_tokens, :estimated_cost,
                    CAST(:latency_ms AS integer), CAST(:success AS boolean),
                    :error_message
                )
                """
            ),
            {
                "user_id": str(user_id),
                "feature": feature,
                "provider": response.provider or "unknown",
                "model": response.model or "unknown",
                "prompt_version": prompt_version or "v1",
                "input_tokens": int(response.usage.input_tokens),
                "output_tokens": int(response.usage.output_tokens),
                "estimated_cost": float(response.estimated_cost_usd),
                "latency_ms": int(response.latency_ms),
                "success": response.status.value == "success",
                "error_message": scrub(response.error),
            },
        )
        await session.commit()
    except Exception:  # pragma: no cover - defensive
        logger.warning("Failed to record ai_calls usage row", exc_info=True)
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:  # pragma: no cover
                pass


async def tokens_used_today(user_id: uuid.UUID) -> int:
    """Total tokens attributed to a user since UTC midnight (RLS-scoped)."""
    session = None
    try:
        session = await _with_identity(user_id)
        result = await session.execute(
            text(
                """
                SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total
                FROM ai_calls
                WHERE user_id = :user_id
                  AND created_at >= date_trunc('day', now() at time zone 'utc') AT TIME ZONE 'utc'
                """
            ),
            {"user_id": str(user_id)},
        )
        return int(result.scalar() or 0)
    except Exception:  # pragma: no cover - defensive
        logger.warning("Failed to read token usage", exc_info=True)
        return 0
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:  # pragma: no cover
                pass