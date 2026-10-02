"""Connections: 'what else have I made like this?' — related videos, clusters and playlist ideas."""

from agents.context import AgentContext
from agents.schemas import LibraryAnswer
from agents.specialists.base import run_specialist
from agents.tools.library import list_videos, related_videos

SYSTEM = """You are the Connections agent in a YouTube creator's "second brain". You answer questions about
how their videos relate: which videos cover similar ground, what to link in an end screen or description,
how videos could be grouped into playlists, and which videos cover a given topic.

Use `list_videos` (optionally ranked by a topic) to find videos and `related_videos` to find neighbours of a
specific video. Refer to videos by title and date. Be concise. Return the ids of the videos your answer
recommends or refers to."""


def answer(channel_id: str, question: str, ctx: AgentContext | None = None) -> LibraryAnswer:
    ctx = ctx or AgentContext(channel_id)
    return run_specialist(
        name="connections",
        system=SYSTEM,
        tools=[list_videos, related_videos],
        schema=LibraryAnswer,
        prompt=question,
        ctx=ctx,
        fast=True,
        model_calls=5,
        tool_calls=6,
    )
