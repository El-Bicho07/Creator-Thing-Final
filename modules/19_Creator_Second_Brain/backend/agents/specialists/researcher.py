"""Researcher: 'Have I talked about this before?' — searches, re-searches and reads context before answering."""

import re

from sqlalchemy import exists, select

from agents.context import AgentContext
from agents.schemas import AskAnswer
from agents.specialists.base import run_specialist
from agents.tools.search import find_excerpts, get_transcript_window, search_transcripts
from db import SessionLocal
from models import Chunk, Video

SYSTEM = """You are the Researcher in a YouTube creator's "second brain". You answer the creator's question
using ONLY what they said in their own past videos. Speak to them directly ("you said...").

How to work:
- You start with the results of a first search. If they are weak (similarity below ~0.6) or miss part of
  the question, call `search_transcripts` again with a rephrased or narrower query (synonyms, the specific
  product/idea, a date range). At most 3 extra searches.
- If an excerpt is ambiguous or cut off, read around it with `get_transcript_window`.
- Cite excerpts inline as [n] using their numbers. Only cite excerpts that support the sentence.
- If nothing covers the topic, say so plainly — never invent content.

verdict: covered = discussed in depth before; partially = touched on briefly or a related angle;
new = never really discussed. For partially/new, suggest a fresh angle they haven't covered."""

MAX_SOURCES = 10


def normalise_citations(text: str) -> str:
    """gpt-oss sometimes cites as 【2】 or 【2†source】 — the UI expects [2]."""
    return re.sub(r"【\s*(\d+)[^】]*】", r"[\1]", text)


def ask(channel_id: str, question: str, ctx: AgentContext | None = None) -> dict:
    ctx = ctx or AgentContext(channel_id)
    with SessionLocal() as session:
        indexed = session.scalar(
            select(exists().where(Chunk.video_id == Video.id, Video.channel_id == channel_id))
        )
    if not indexed:
        return {"verdict": "new", "answer": "Nothing indexed yet for this channel.", "sources": [], "fresh_angle": ""}

    first = find_excerpts(ctx, question, limit=8)
    data: AskAnswer = run_specialist(
        name="researcher",
        system=SYSTEM,
        tools=[search_transcripts, get_transcript_window],
        schema=AskAnswer,
        prompt=f"Question: {question}\n\nFirst search results:\n{first}",
        ctx=ctx,
        model_calls=5,
        tool_calls=5,
    )

    answer = normalise_citations(data.answer)
    in_text = {int(n) for group in re.findall(r"\[(\d+(?:,\s*\d+)*)\]", answer) for n in re.split(r",\s*", group)}
    cited = {n for n in {*data.cited, *in_text} if ctx.evidence.get(n)}
    chunks = [e for e in ctx.evidence.all() if e["kind"] == "chunk"]
    # everything cited, then the strongest remaining hits — numbers stay stable so [n] in the answer still resolves
    extra = sorted((e for e in chunks if e["n"] not in cited), key=lambda e: -e["similarity"])
    keep = {e["n"] for e in chunks if e["n"] in cited} | {e["n"] for e in extra[: max(0, MAX_SOURCES - len(cited))]}
    sources = [
        {k: v for k, v in e.items() if k not in ("kind", "chunk_id", "end")} | {"cited": e["n"] in cited}
        for e in chunks
        if e["n"] in keep
    ]
    return {"verdict": data.verdict, "answer": answer, "fresh_angle": data.fresh_angle, "sources": sources}
