"""'Have I talked about this before?' — served by the Researcher agent (agents/specialists/researcher.py)."""

from sqlalchemy.orm import Session


def ask(session: Session, channel_id: str, question: str) -> dict:
    from agents.specialists.researcher import ask as run

    return run(channel_id, question)
