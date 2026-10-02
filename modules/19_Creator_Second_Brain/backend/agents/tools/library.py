"""Catalogue tools: videos, promises, opinion topics and video-to-video connections."""

from langchain.tools import ToolRuntime, tool
from sqlalchemy import select

from agents.context import AgentContext
from agents.tools.search import _date
from ai.drift import list_topics
from db import SessionLocal
from models import Promise, Video
from search.embeddings import embed_query
from search.graph import related_videos as _related
from search.vector import fmt_ts


def _video_line(v: Video, sim: float | None = None) -> str:
    extra = f" · similarity {sim:.2f}" if sim is not None else ""
    mins = f"{v.duration_sec // 60}m" if v.duration_sec else "?"
    return f'- video_id={v.id} | {v.published_at:%Y-%m-%d} | "{v.title}" | {v.view_count:,} views | {mins}{extra}'


@tool
def list_videos(
    runtime: ToolRuntime[AgentContext],
    query: str | None = None,
    after: str | None = None,
    before: str | None = None,
    limit: int = 15,
) -> str:
    """List the channel's videos — newest first, or ranked by topic similarity when `query` is given.

    Args:
        query: optional topic to rank videos by
        after: optional YYYY-MM-DD
        before: optional YYYY-MM-DD
        limit: max videos (default 15, max 40)
    """
    ctx = runtime.context
    ctx.step("list_videos", query or "")
    limit = max(1, min(limit, 40))
    with SessionLocal() as session:
        stmt = select(Video).where(Video.channel_id == ctx.channel_id)
        if (a := _date(after)) is not None:
            stmt = stmt.where(Video.published_at > a)
        if (b := _date(before)) is not None:
            stmt = stmt.where(Video.published_at < b)
        if query:
            dist = Video.embedding.cosine_distance(embed_query(query)).label("dist")
            rows = session.execute(
                stmt.add_columns(dist).where(Video.embedding.is_not(None)).order_by(dist).limit(limit)
            ).all()
            lines = [_video_line(v, 1 - d) for v, d in rows]
        else:
            lines = [_video_line(v) for v in session.scalars(stmt.order_by(Video.published_at.desc()).limit(limit))]
        return "\n".join(lines) or "No videos match."


@tool
def related_videos(video_id: str, runtime: ToolRuntime[AgentContext]) -> str:
    """Videos most similar in content to the given video."""
    ctx = runtime.context
    ctx.step("related_videos", video_id)
    with SessionLocal() as session:
        video = session.get(Video, video_id)
        if video is None or video.channel_id != ctx.channel_id:
            return f"Unknown video_id {video_id}."
        rows = _related(session, video_id)
        if not rows:
            return "No related videos (this video has no transcript embedding yet)."
        return f'Related to "{video.title}":\n' + "\n".join(
            f'- video_id={r["video_id"]} | {r["published_at"][:10]} | "{r["title"]}" · similarity {r["similarity"]:.2f}'
            for r in rows
        )


@tool
def list_stance_topics(runtime: ToolRuntime[AgentContext]) -> str:
    """Opinion topics the creator has taken a stance on, with how many videos mention each. Use it to map a
    loosely-worded topic onto the names actually stored."""
    ctx = runtime.context
    ctx.step("list_stance_topics")
    with SessionLocal() as session:
        topics = list_topics(session, ctx.channel_id)
    return "\n".join(f'- {t["topic"]} ({t["videos"]} videos)' for t in topics) or "No stances recorded yet."


@tool
def list_promises(
    runtime: ToolRuntime[AgentContext], status: str | None = None, query: str | None = None
) -> str:
    """On-camera promises the creator made, with whether a later video delivered them.

    Args:
        status: optional filter — open | fulfilled | dismissed
        query: optional topic to rank promises by
    """
    ctx = runtime.context
    ctx.step("list_promises", " ".join(filter(None, [status, query])))
    with SessionLocal() as session:
        stmt = (
            select(Promise, Video)
            .join(Video, Promise.video_id == Video.id)
            .where(Video.channel_id == ctx.channel_id)
        )
        if status in ("open", "fulfilled", "dismissed"):
            stmt = stmt.where(Promise.status == status)
        if query:
            stmt = stmt.where(Promise.embedding.is_not(None)).order_by(
                Promise.embedding.cosine_distance(embed_query(query))
            )
        else:
            stmt = stmt.order_by(Video.published_at.desc())
        rows = session.execute(stmt.limit(25)).all()
        if not rows:
            return "No promises found."
        return "\n".join(
            f'- promise_id={p.id} | {p.status}{" (set manually)" if p.manual else ""} | made {v.published_at:%Y-%m-%d} '
            f'in "{v.title}" at {fmt_ts(p.timestamp)} | {p.promise} | evidence: {p.evidence or "-"}'
            for p, v in rows
        )
