"""The Brain: a supervisor agent that routes the creator's chat messages to the specialist agents.

Specialists are exposed to the supervisor as tools ("agents as tools"). Each returns a short text summary
for the supervisor to reason over, plus a card (the specialist's full structured result) as the tool
artifact — cards are streamed to the UI and kept in the thread, but never sent back to the model.
"""

import sqlite3
import threading

from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware
from langchain.tools import ToolRuntime, tool
from langgraph.checkpoint.sqlite import SqliteSaver
from sqlalchemy import select

from agents.context import AgentContext
from agents.llm import chat_model, guardrails
from agents.specialists import clip_editor, connections, drift_analyst, promise_auditor, researcher
from ai.llm import LLMError
from config import ROOT_DIR, settings
from db import SessionLocal
from models import Promise, Video
from search.vector import fmt_ts, yt_url

SYSTEM = """You are the Brain — the second brain of a YouTube creator, built from every transcript of their
channel. You lead a team of specialist agents and talk to the creator directly ("you said...").

Your team (call them as tools):
- researcher — "have I talked about X before?", what they said about something, facts from their videos.
- clip_editor — build a new Short/Reel by stitching moments from existing videos on a theme.
- drift_analyst — how their opinion on a topic changed over time.
- promise_auditor — promises they made on camera ("part 2 coming", "I'll review this") and whether they kept them.
- connections — which videos relate to each other, what to link, playlist groupings, videos on a topic.

How to work:
- Pick the specialist(s) the message needs. Split multi-part requests and call several specialists; call
  them one after another when a later step depends on an earlier result.
- Give each specialist a clear, self-contained request (resolve "it"/"that" from the conversation first).
- Don't call a specialist for greetings, thanks or questions about this conversation itself.
- The creator sees every specialist's full result as a card below your reply, with sources, clips or charts.
  So don't repeat everything: give a short synthesis (2-6 sentences), connect the results, and suggest a
  useful next step. Keep [n] citations exactly as the researcher wrote them — they point to its card.
- If a specialist fails or finds nothing, say so honestly; never invent videos, quotes or timestamps."""


def _run(runtime: ToolRuntime[AgentContext], agent: str, detail: str, fn) -> tuple[str, dict | None]:
    emit = runtime.stream_writer or (lambda event: None)
    emit({"type": "step", "agent": "brain", "tool": agent, "detail": detail[:200]})
    try:
        summary, card = fn(runtime.context.child(agent, emit))
    except LLMError as e:
        return f"The {agent} failed: {e}", None
    if card is not None:
        card = {"kind": card["kind"], "agent": agent, "data": card["data"]}
        emit({"type": "card", **card})
    return summary, card


def _promise_cards(channel_id: str, ids: list[int]) -> list[dict]:
    with SessionLocal() as session:
        rows = session.execute(
            select(Promise, Video)
            .join(Video, Promise.video_id == Video.id)
            .where(Video.channel_id == channel_id, Promise.id.in_(ids[:10]))
        ).all()
        return [
            {
                "id": p.id,
                "promise": p.promise,
                "status": p.status,
                "evidence": p.evidence,
                "video_id": v.id,
                "title": v.title,
                "thumbnail": v.thumbnail,
                "published_at": v.published_at.isoformat(),
                "timestamp": fmt_ts(p.timestamp),
                "url": yt_url(v.id, p.timestamp),
            }
            for p, v in rows
        ]


def _video_cards(channel_id: str, ids: list[str]) -> list[dict]:
    with SessionLocal() as session:
        videos = {
            v.id: v
            for v in session.scalars(select(Video).where(Video.channel_id == channel_id, Video.id.in_(ids[:12])))
        }
        return [
            {
                "video_id": v.id,
                "title": v.title,
                "thumbnail": v.thumbnail,
                "published_at": v.published_at.isoformat(),
                "url": yt_url(v.id),
            }
            for v in (videos.get(i) for i in ids)
            if v is not None
        ]


@tool(response_format="content_and_artifact")
def ask_researcher(question: str, runtime: ToolRuntime[AgentContext]) -> tuple[str, dict | None]:
    """Ask the Researcher what the creator has said in past videos about something."""

    def go(ctx):
        r = researcher.ask(ctx.channel_id, question, ctx)
        text = f"verdict: {r['verdict']}\nanswer: {r['answer']}"
        if r["fresh_angle"]:
            text += f"\nfresh angle: {r['fresh_angle']}"
        return text + f"\n({len(r['sources'])} sources shown in the card)", {"kind": "ask", "data": r}

    return _run(runtime, "researcher", question, go)


@tool(response_format="content_and_artifact")
def ask_clip_editor(theme: str, runtime: ToolRuntime[AgentContext], target_seconds: int = 45) -> tuple[str, dict | None]:
    """Ask the Clip Editor to build a new Short from existing moments on a theme.

    Args:
        theme: what the Short is about
        target_seconds: target length, 15-90 (default 45)
    """

    def go(ctx):
        r = clip_editor.compose(ctx.channel_id, theme, max(15, min(target_seconds, 90)), ctx)
        if "error" in r:
            return r["error"], None
        clips = "\n".join(f'- {c["role"]}: "{c["title"]}" {c["timestamp"]}' for c in r["clips"])
        return (
            f'Built "{r["title"]}" — {r["total_seconds"]} s from {r["source_videos"]} videos.\n'
            f'Hook overlay: {r["hook_overlay"]}\n{clips}',
            {"kind": "compose", "data": r},
        )

    return _run(runtime, "clip_editor", theme, go)


@tool(response_format="content_and_artifact")
def ask_drift_analyst(topic: str, runtime: ToolRuntime[AgentContext]) -> tuple[str, dict | None]:
    """Ask the Drift Analyst how the creator's opinion on a topic evolved over time."""

    def go(ctx):
        r = drift_analyst.analyze_drift(ctx.channel_id, topic, ctx)
        if not r["points"]:
            return r["summary"], None
        text = f"{len(r['points'])} stances, {len(r['shifts'])} shifts.\nsummary: {r['summary']}"
        if r["video_idea"]:
            text += f"\nvideo idea: {r['video_idea']}"
        return text, {"kind": "drift", "data": r}

    return _run(runtime, "drift_analyst", topic, go)


@tool(response_format="content_and_artifact")
def ask_promise_auditor(question: str, runtime: ToolRuntime[AgentContext]) -> tuple[str, dict | None]:
    """Ask the Promise Auditor about promises the creator made on camera and whether they kept them."""

    def go(ctx):
        r = promise_auditor.answer(ctx.channel_id, question, ctx)
        rows = _promise_cards(ctx.channel_id, r.promise_ids)
        return r.answer, ({"kind": "promises", "data": {"promises": rows}} if rows else None)

    return _run(runtime, "promise_auditor", question, go)


@tool(response_format="content_and_artifact")
def ask_connections(question: str, runtime: ToolRuntime[AgentContext]) -> tuple[str, dict | None]:
    """Ask the Connections agent how videos relate: similar videos, what to link, playlist groupings."""

    def go(ctx):
        r = connections.answer(ctx.channel_id, question, ctx)
        rows = _video_cards(ctx.channel_id, r.video_ids)
        return r.answer, ({"kind": "videos", "data": {"videos": rows}} if rows else None)

    return _run(runtime, "connections", question, go)


TOOLS = [ask_researcher, ask_clip_editor, ask_drift_analyst, ask_promise_auditor, ask_connections]

_lock = threading.Lock()
_brain = None
_saver: SqliteSaver | None = None


def checkpointer() -> SqliteSaver:
    global _saver
    if _saver is None:
        path = ROOT_DIR / "backend" / "data" / "agent_state.sqlite"
        path.parent.mkdir(parents=True, exist_ok=True)
        _saver = SqliteSaver(sqlite3.connect(path, check_same_thread=False))
    return _saver


def brain():
    global _brain
    with _lock:
        if _brain is None:
            _brain = create_agent(
                chat_model(),
                TOOLS,
                system_prompt=SYSTEM,
                context_schema=AgentContext,
                middleware=[
                    # keep long threads inside Groq's token-per-minute budget
                    SummarizationMiddleware(chat_model(fast=True), trigger=("tokens", settings.agent_context_tokens), keep=("messages", 10)),
                    *guardrails(model_calls=6, tool_calls=5),
                ],
                checkpointer=checkpointer(),
                name="brain",
            )
    return _brain
