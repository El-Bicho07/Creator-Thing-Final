"""pgvector similarity queries scoped to one channel."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Chunk, Stance, Video


def search_chunks(
    session: Session,
    channel_id: str,
    query_vec: list[float],
    limit: int = 10,
    published_after: datetime | None = None,
    min_similarity: float = 0.0,
) -> list[tuple[Chunk, Video, float]]:
    dist = Chunk.embedding.cosine_distance(query_vec).label("dist")
    stmt = (
        select(Chunk, Video, dist)
        .join(Video, Chunk.video_id == Video.id)
        .where(Video.channel_id == channel_id)
        .order_by(dist)
        .limit(limit)
    )
    if published_after is not None:
        stmt = stmt.where(Video.published_at > published_after)
    rows = session.execute(stmt).all()
    return [(c, v, 1 - d) for c, v, d in rows if 1 - d >= min_similarity]


def search_stances(
    session: Session, channel_id: str, query_vec: list[float], limit: int = 25, min_similarity: float = 0.0
) -> list[tuple[Stance, Video, float]]:
    dist = Stance.embedding.cosine_distance(query_vec).label("dist")
    stmt = (
        select(Stance, Video, dist)
        .join(Video, Stance.video_id == Video.id)
        .where(Video.channel_id == channel_id)
        .order_by(dist)
        .limit(limit)
    )
    rows = session.execute(stmt).all()
    return [(s, v, 1 - d) for s, v, d in rows if 1 - d >= min_similarity]


def yt_url(video_id: str, seconds: float = 0) -> str:
    return f"https://www.youtube.com/watch?v={video_id}&t={int(seconds)}s"


def fmt_ts(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def segments_between(chunks: list[Chunk], start: float, end: float) -> str:
    """Transcript text for [start, end) using the chunks' per-line segments."""
    lines = []
    for c in chunks:
        for seg_start, text in c.segments:
            if start - 0.5 <= seg_start < end:
                lines.append(text)
    return " ".join(lines)
