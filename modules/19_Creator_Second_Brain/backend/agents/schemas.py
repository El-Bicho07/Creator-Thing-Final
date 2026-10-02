"""Final outputs the specialists submit. Numbers like `cited` / `ref` point into the run's Evidence registry."""

from typing import Literal

from pydantic import BaseModel, Field


class AskAnswer(BaseModel):
    verdict: Literal["covered", "partially", "new"] = Field(
        description="covered = discussed in depth before; partially = touched on briefly or a related angle; "
        "new = never really discussed"
    )
    answer: str = Field(description="2-6 sentences to the creator ('you said...'), markdown allowed, with [n] citations")
    cited: list[int] = Field(default_factory=list, description="excerpt numbers the answer relies on")
    fresh_angle: str = Field(default="", description="if partially/new: an angle not covered yet; else empty")


class ClipSpec(BaseModel):
    video_id: str
    start: float = Field(description="seconds — a line start time from that video's transcript")
    end: float = Field(description="seconds")
    role: Literal["hook", "context", "proof", "payoff", "cta"]
    why: str = Field(default="", description="why this piece, in this position")


class Composition(BaseModel):
    title: str = Field(description="working title")
    hook_overlay: str = Field(description="punchy on-screen text for the first 2 seconds")
    clips: list[ClipSpec] = Field(description="3-5 clips in playback order")
    caption: str = Field(description="post caption with 2-3 hashtags")
    editor_notes: str = Field(default="", description="transitions, b-roll or text suggestions")


class PromiseVerdict(BaseModel):
    fulfilled: bool
    ref: int | None = Field(default=None, description="number of the excerpt that delivers the promise, or null")
    evidence: str = Field(description="one sentence explaining the decision")


class DriftAxis(BaseModel):
    negative: str = Field(description="label for -1, e.g. 'Against'")
    positive: str = Field(description="label for +1, e.g. 'In favour'")


class DriftPoint(BaseModel):
    ref: int = Field(description="stance number")
    position: float = Field(ge=-1, le=1)
    label: str = Field(description="3-6 word summary")


class DriftShift(BaseModel):
    from_ref: int
    to_ref: int
    type: Literal["reversal", "softening", "strengthening", "contradiction"]
    explanation: str


class DriftAnalysis(BaseModel):
    axis: DriftAxis
    points: list[DriftPoint] = Field(description="only stances actually about the topic")
    shifts: list[DriftShift] = Field(default_factory=list)
    summary: str = Field(description="2-3 sentences on how the view evolved, or that it stayed consistent")
    video_idea: str = Field(default="", description="a video idea built on this evolution, or empty")


class LibraryAnswer(BaseModel):
    """Chat answers from the Promise Auditor and Connections agents."""

    answer: str = Field(description="concise answer to the creator, markdown allowed")
    promise_ids: list[int] = Field(default_factory=list, description="ids of promises the answer is about")
    video_ids: list[str] = Field(default_factory=list, description="ids of videos the answer recommends or refers to")
