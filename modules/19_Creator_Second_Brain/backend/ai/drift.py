"""Opinion Drift — topic listing here; the analysis is served by the Drift Analyst agent."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Stance, Video


def list_topics(session: Session, channel_id: str, limit: int = 40) -> list[dict]:
    videos = func.count(func.distinct(Stance.video_id))
    rows = session.execute(
        select(Stance.topic, videos.label("videos"), func.count().label("mentions"))
        .join(Video, Stance.video_id == Video.id)
        .where(Video.channel_id == channel_id)
        .group_by(Stance.topic)
        .order_by(videos.desc(), func.count().desc())
        .limit(limit)
    ).all()
    return [{"topic": t, "videos": v, "mentions": m} for t, v, m in rows]


def analyze_drift(session: Session, channel_id: str, topic: str) -> dict:
    from agents.specialists.drift_analyst import analyze_drift as run

    return run(channel_id, topic)
