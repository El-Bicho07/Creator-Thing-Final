"""Retrieval tools shared by the specialists. Every query is scoped to the context's channel."""

from collections import defaultdict
from datetime import datetime

from langchain.tools import ToolRuntime, tool
from sqlalchemy import select

from agents.context import AgentContext
from db import SessionLocal
from models import Chunk, ReelCandidate, Video
from search.embeddings import embed_query
from search.vector import fmt_ts, search_chunks, search_stances, yt_url


def _date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value[:10])
    except ValueError:
        return None


def register_chunk(ctx: AgentContext, chunk: Chunk, video: Video, sim: float) -> int:
    return ctx.evidence.add(
        ("chunk", chunk.id),
        {
            "kind": "chunk",
            "chunk_id": chunk.id,
            "video_id": video.id,
            "title": video.title,
            "published_at": video.published_at.isoformat(),
            "thumbnail": video.thumbnail,
            "start": chunk.start,
            "end": chunk.end,
            "timestamp": fmt_ts(chunk.start),
            "url": yt_url(video.id, chunk.start),
            "text": chunk.text,
            "similarity": round(sim, 3),
        },
    )


def find_excerpts(
    ctx: AgentContext,
    query: str,
    limit: int = 8,
    after: str | None = None,
    before: str | None = None,
    video_id: str | None = None,
    with_lines: bool = False,
    per_video: int | None = None,
) -> str:
    """Search, register hits as numbered evidence and render them for the model.
    `per_video` caps excerpts from any one video so results span several videos."""
    floor = ctx.scratch.get("published_after")  # e.g. the Promise Auditor may only look at later videos
    after_dt = max(filter(None, [_date(after), floor]), default=None)
    before_dt = _date(before)
    with SessionLocal() as session:
        # over-fetch, then filter by date/video here so the pgvector query stays simple
        hits = search_chunks(session, ctx.channel_id, embed_query(query), limit=limit * 5, published_after=after_dt)
        hits = [
            h
            for h in hits
            if (before_dt is None or h[1].published_at < before_dt) and (video_id is None or h[1].id == video_id)
        ]
        if per_video:
            capped, per = [], defaultdict(int)
            for h in hits:
                per[h[1].id] += 1
                if per[h[1].id] <= per_video:
                    capped.append(h)
            hits = capped
        hits = hits[:limit]
        if not hits:
            return "No matching excerpts."
        out = []
        for c, v, sim in hits:
            n = register_chunk(ctx, c, v, sim)
            head = f'[{n}] "{v.title}" ({v.published_at:%Y-%m-%d}) video_id={v.id} at {fmt_ts(c.start)} · similarity {sim:.2f}'
            body = "\n".join(f"  [{s}] {t}" for s, t in c.segments) if with_lines else c.text[:700]
            out.append(f"{head}\n{body}")
        return "\n\n".join(out)


@tool
def search_transcripts(
    query: str,
    runtime: ToolRuntime[AgentContext],
    after: str | None = None,
    before: str | None = None,
    video_id: str | None = None,
) -> str:
    """Semantic search over the creator's video transcripts. Returns numbered excerpts you can cite as [n].

    Args:
        query: what to look for — rephrase or narrow it if the first results are weak (similarity < 0.6)
        after: optional YYYY-MM-DD, only videos published after this date
        before: optional YYYY-MM-DD, only videos published before this date
        video_id: optional, restrict to one video
    """
    ctx = runtime.context
    ctx.step("search_transcripts", query)
    return find_excerpts(ctx, query, after=after, before=before, video_id=video_id)


@tool
def search_moments(query: str, runtime: ToolRuntime[AgentContext]) -> str:
    """Search transcripts for moments to cut into a Short. Every line is shown with its start time in seconds,
    e.g. "[83.2] text" — clip start/end times must be taken from these line starts."""
    ctx = runtime.context
    ctx.step("search_moments", query)
    return find_excerpts(ctx, query, limit=6, with_lines=True, per_video=2)


@tool
def get_transcript_window(video_id: str, start: float, end: float, runtime: ToolRuntime[AgentContext]) -> str:
    """Read a video's transcript between two times (seconds, max 180 s) to see what surrounds an excerpt."""
    ctx = runtime.context
    ctx.step("get_transcript_window", f"{video_id} {fmt_ts(start)}–{fmt_ts(end)}")
    end = min(end, start + 180)
    with SessionLocal() as session:
        video = session.get(Video, video_id)
        if video is None or video.channel_id != ctx.channel_id:
            return f"Unknown video_id {video_id}."
        chunks = session.scalars(
            select(Chunk).where(Chunk.video_id == video_id, Chunk.end >= start, Chunk.start <= end).order_by(Chunk.start)
        ).all()
        lines = [f"[{s}] {t}" for c in chunks for s, t in c.segments if start - 0.5 <= s <= end]
        if not lines:
            return "No transcript in that range."
        return f'"{video.title}" ({video.published_at:%Y-%m-%d}) {fmt_ts(start)}–{fmt_ts(end)}:\n' + "\n".join(lines)


def find_stances(ctx: AgentContext, topic: str, limit: int = 20) -> str:
    with SessionLocal() as session:
        hits = search_stances(session, ctx.channel_id, embed_query(topic), limit=limit, min_similarity=0.55)
        if not hits:
            return "No stances found for that topic."
        hits.sort(key=lambda h: h[1].published_at)
        out = []
        for s, v, sim in hits:
            n = ctx.evidence.add(
                ("stance", s.id),
                {
                    "kind": "stance",
                    "stance_id": s.id,
                    "video_id": v.id,
                    "published_at": v.published_at.isoformat(),
                },
            )
            out.append(
                f'[{n}] {v.published_at:%Y-%m-%d} | "{v.title}" | topic: {s.topic} | stance: {s.stance} | '
                f'quote: "{s.quote}" | similarity {sim:.2f}'
            )
        return "Stances, oldest first:\n" + "\n".join(out)


@tool
def search_stance_records(topic: str, runtime: ToolRuntime[AgentContext]) -> str:
    """Find the opinions the creator expressed on a topic (oldest first), numbered [n]. Try related wordings
    if a topic name returns few stances."""
    ctx = runtime.context
    ctx.step("search_stances", topic)
    return find_stances(ctx, topic)


@tool
def search_reel_candidates(query: str, runtime: ToolRuntime[AgentContext]) -> str:
    """Pre-scored standalone moments (reel candidates) related to a query, best first. Useful as a strong
    hook or payoff; cut times still have to match transcript lines."""
    ctx = runtime.context
    ctx.step("search_reels", query)
    with SessionLocal() as session:
        dist = ReelCandidate.embedding.cosine_distance(embed_query(query))
        rows = session.execute(
            select(ReelCandidate, Video)
            .join(Video)
            .where(Video.channel_id == ctx.channel_id)
            .order_by(dist - ReelCandidate.score / 400)
            .limit(5)
        ).all()
        if not rows:
            return "No reel candidates."
        return "\n".join(
            f'- "{v.title}" video_id={v.id} {r.start}–{r.end}s score {r.score:.0f}: hook "{r.hook}" — {r.transcript[:300]}'
            for r, v in rows
        )
