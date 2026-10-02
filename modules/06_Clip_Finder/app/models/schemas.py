from pydantic import BaseModel, Field
from typing import List, Optional

class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str

    @property
    def start_formatted(self) -> str:
        return format_timestamp(self.start)

    @property
    def end_formatted(self) -> str:
        return format_timestamp(self.end)


class ClipCandidate(BaseModel):
    title: str = Field(..., description="Catchy title for the clip")
    start_time: str = Field(..., description="Start timestamp in HH:MM:SS or MM:SS format")
    end_time: str = Field(..., description="End timestamp in HH:MM:SS or MM:SS format")
    start_sec: float = 0.0
    end_sec: float = 0.0
    duration: float = 0.0
    score: int = Field(default=80, ge=0, le=100, description="Quality score 0-100")
    topic: str = "General"
    hook: str = ""
    reason: str = ""
    context_required: bool = False
    generated_file: Optional[str] = None
    transcript_snippet: Optional[str] = None
    breakdown: dict = Field(default_factory=dict)


class ClipAnalysisResponse(BaseModel):
    clips: List[ClipCandidate] = []


def seconds_to_timestamp(seconds: float) -> str:
    """Convert float seconds to HH:MM:SS format."""
    total_sec = max(0.0, seconds)
    hours = int(total_sec // 3600)
    minutes = int((total_sec % 3600) // 60)
    secs = int(total_sec % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"



def timestamp_to_seconds(ts: str) -> float:
    """Parse HH:MM:SS or MM:SS string to seconds float."""
    if not ts or not isinstance(ts, str):
        return 0.0
    parts = ts.strip().replace(",", ".").split(":")
    try:
        parts = [float(p) for p in parts]
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 1:
            return parts[0]
    except ValueError:
        return 0.0
    return 0.0


def format_timestamp(t: float) -> str:
    return seconds_to_timestamp(t)
