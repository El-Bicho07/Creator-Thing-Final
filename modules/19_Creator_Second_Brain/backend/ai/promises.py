"""Promise Ledger — served by the Promise Auditor agent (agents/specialists/promise_auditor.py)."""

from sqlalchemy.orm import Session

from models import Promise


def match_promise(session: Session, promise: Promise) -> None:
    from agents.specialists.promise_auditor import verify_promise

    verify_promise(session, promise)


def match_all_promises(session: Session, channel_id: str, on_progress=None) -> int:
    from agents.specialists.promise_auditor import verify_all

    return verify_all(session, channel_id, on_progress)
