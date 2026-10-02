"""Drift Analyst: how the creator's stance on a topic changed over time."""

from agents.context import AgentContext
from agents.schemas import DriftAnalysis
from agents.specialists.base import run_specialist
from agents.tools.library import list_stance_topics
from agents.tools.search import find_stances, get_transcript_window, search_stance_records
from db import SessionLocal
from models import Stance, Video
from search.vector import fmt_ts, yt_url

SYSTEM = """You are the Drift Analyst in a YouTube creator's "second brain". You track how their opinion on a
topic evolved. Stances are numbered [n] and listed oldest first.

How to work:
- The topic the creator types may not match stored topic names. If the first stances are few or off-topic,
  call `list_stance_topics` and search again with the closest stored names or synonyms (at most 3 searches).
- If a quote is ambiguous, read around it with `get_transcript_window`.
- Place each stance that is actually about the topic on an axis from -1 to +1 and label both ends.
  Leave out stances that aren't about the topic.
- Record shifts between stances (reversal, softening, strengthening, contradiction) with one-sentence
  explanations, write a 2-3 sentence summary, and suggest a video idea built on the evolution
  (e.g. "Why I changed my mind about X") if there is one."""

NOT_ENOUGH = "You've only expressed an opinion on this in one video (or none), so there's no drift to track yet."


def _empty(topic: str, summary: str = NOT_ENOUGH) -> dict:
    return {
        "topic": topic,
        "points": [],
        "shifts": [],
        "summary": summary,
        "axis": {"negative": "Against", "positive": "In favour"},
        "video_idea": "",
    }


def analyze_drift(channel_id: str, topic: str, ctx: AgentContext | None = None) -> dict:
    ctx = ctx or AgentContext(channel_id)
    first = find_stances(ctx, topic)
    data: DriftAnalysis = run_specialist(
        name="drift_analyst",
        system=SYSTEM,
        tools=[search_stance_records, list_stance_topics, get_transcript_window],
        schema=DriftAnalysis,
        prompt=f"Topic: {topic}\n\n{first}",
        ctx=ctx,
        model_calls=6,
        tool_calls=6,
    )

    ref_to_id = {e["n"]: e["stance_id"] for e in ctx.evidence.all() if e["kind"] == "stance"}
    points = []
    with SessionLocal() as session:
        for p in data.points:
            sid = ref_to_id.get(p.ref)
            s = session.get(Stance, sid) if sid else None
            v = session.get(Video, s.video_id) if s else None
            if s is None or v is None or v.channel_id != channel_id:
                continue
            points.append(
                {
                    "id": s.id,
                    "position": max(-1.0, min(1.0, p.position)),
                    "label": p.label,
                    "stance": s.stance,
                    "quote": s.quote,
                    "video_id": v.id,
                    "title": v.title,
                    "thumbnail": v.thumbnail,
                    "published_at": v.published_at.isoformat(),
                    "timestamp": fmt_ts(s.timestamp),
                    "url": yt_url(v.id, s.timestamp),
                }
            )
    points.sort(key=lambda p: p["published_at"])
    if len({p["video_id"] for p in points}) < 2:
        return _empty(topic)

    valid = {p["id"] for p in points}
    shifts = []
    for s in data.shifts:
        a, b = ref_to_id.get(s.from_ref), ref_to_id.get(s.to_ref)
        if a in valid and b in valid:
            shifts.append({"from_id": a, "to_id": b, "type": s.type, "explanation": s.explanation})
    return {
        "topic": topic,
        "axis": data.axis.model_dump(),
        "points": points,
        "shifts": shifts,
        "summary": data.summary,
        "video_idea": data.video_idea,
    }
