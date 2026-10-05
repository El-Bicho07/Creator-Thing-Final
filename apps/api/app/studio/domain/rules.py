"""Deterministic Studio domain rules.

Adapted from Module 18 (Guruvelah), which was the strongest donor here:

- `lib/domain/platforms.ts:14` — per-platform character caps, hashtag ranges,
  default durations, and content kind.
- `lib/domain/timing.ts:10` — `allocate_segments`: a pure HOOK/SETUP/VALUE/PAYOFF/CTA
  skeleton whose durations always sum exactly to the target.
- `lib/domain/formats.ts:1` — the format taxonomy and per-platform subsets.
- `lib/domain/goals.ts:1` — goal -> directive text.
- `lib/domain/lifecycle.ts:1` — trend lifecycle -> directive text.

These are deliberately pure functions with no LLM and no I/O. Segment timing is
arithmetic; spending a model call to add up durations would be both slower and
less reliable. Studio therefore *computes* structure and asks the model only for
prose.

Adapted, not copied: the donor hardcoded model names, prompt text and its own
provider client. None of that is imported here.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# --------------------------------------------------------------------------- #
# Platforms
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class PlatformConfig:
    key: str
    label: str
    kind: str                      # 'video' | 'text'
    default_duration_sec: int = 30
    caption_char_cap: int = 2200
    caption_aim_chars: int = 700
    hashtag_min: int = 0
    hashtag_max: int = 0
    cta_norm: str = ""


PLATFORMS: Dict[str, PlatformConfig] = {
    "reel": PlatformConfig(
        "reel", "Instagram Reel", "video", 30, 2200, 400, 3, 8,
        "speak one clear next step",
    ),
    "shorts": PlatformConfig(
        "shorts", "YouTube Shorts", "video", 30, 5000, 700, 0, 5,
        "ask for a subscribe and a comment",
    ),
    "tiktok": PlatformConfig(
        "tiktok", "TikTok", "video", 30, 2200, 400, 3, 6,
        "invite a follow",
    ),
    "youtube": PlatformConfig(
        "youtube", "YouTube video", "video", 480, 5000, 1200, 0, 10,
        "like, subscribe, and comment",
    ),
    "linkedin": PlatformConfig(
        "linkedin", "LinkedIn", "text", 0, 3000, 1200, 0, 5,
        "add a specific professional next step",
    ),
    "x": PlatformConfig(
        "x", "X / Twitter", "text", 0, 280, 240, 0, 2,
        "drive a reply",
    ),
    "instagram_post": PlatformConfig(
        "instagram_post", "Instagram post", "text", 0, 2200, 900, 3, 10,
        "ask for a save or a share",
    ),
    "blog": PlatformConfig(
        "blog", "Blog post", "text", 0, 20000, 3000, 0, 0,
        "summarise the takeaway",
    ),
}

#: Module 18 exposed aliases for these keys; accept them so a client that used
#: the donor vocabulary still routes correctly.
_PLATFORM_ALIASES = {
    "instagram_reels": "reel",
    "ig_reel": "reel",
    "youtube_shorts": "shorts",
    "yt_short": "shorts",
    "twitter": "x",
    "ig": "instagram_post",
    "instagram": "instagram_post",
    "long_form": "blog",
}


def resolve_platform(platform: Optional[str]) -> PlatformConfig:
    """Resolve a platform key, accepting donor aliases.

    Unknown platforms fall back to Reel rather than raising: an unknown value
    should still produce usable content, and the capability response reports the
    platform actually used.
    """
    if not platform:
        return PLATFORMS["reel"]
    key = platform.strip().lower().replace("-", "_").replace(" ", "_")
    key = _PLATFORM_ALIASES.get(key, key)
    return PLATFORMS.get(key, PLATFORMS["reel"])


def list_platforms() -> List[str]:
    return sorted(PLATFORMS)


# --------------------------------------------------------------------------- #
# Formats
# --------------------------------------------------------------------------- #

FORMATS: Dict[str, str] = {
    "tutorial": "step-by-step how-to",
    "story": "personal narrative arc",
    "contrarian": "argue against the consensus",
    "listicle": "numbered list of items",
    "before_after": "transformation comparison",
    "case_study": "detailed worked example",
    "mistakes": "common errors to avoid",
    "comparison": "option A versus option B",
    "explainer": "make a hard idea simple",
    "hype": "high-energy announcement",
    "interview_qa": "question and answer format",
    "poetic": "rhythm and metaphor led",
    "newsletter_edit": "concise editorial note",
}

ALLOWED_FORMATS_BY_PLATFORM: Dict[str, List[str]] = {
    "reel": ["tutorial", "story", "contrarian", "listicle", "before_after",
             "mistakes", "hype", "explainer", "poetic"],
    "shorts": ["tutorial", "story", "contrarian", "listicle", "mistakes",
               "explainer", "hype"],
    "tiktok": ["story", "contrarian", "listicle", "before_after", "mistakes",
               "hype", "poetic"],
    "youtube": ["tutorial", "story", "case_study", "comparison", "explainer",
                "interview_qa", "mistakes", "listicle"],
    "linkedin": ["story", "case_study", "contrarian", "listicle", "newsletter_edit",
                 "explainer"],
    "x": ["contrarian", "listicle", "hype", "poetic", "newsletter_edit"],
    "instagram_post": ["story", "listicle", "before_after", "tutorial", "hype",
                       "poetic", "newsletter_edit"],
    "blog": ["tutorial", "case_study", "comparison", "explainer", "listicle",
             "newsletter_edit", "story", "contrarian"],
}


def allowed_formats(platform: Optional[str]) -> List[str]:
    return list(ALLOWED_FORMATS_BY_PLATFORM[resolve_platform(platform).key])


def resolve_format(fmt: Optional[str], platform: Optional[str]) -> Optional[str]:
    """Return a format valid for the platform, or None to let Studio decide."""
    if not fmt:
        return None
    key = fmt.strip().lower().replace("-", "_").replace(" ", "_")
    if key not in FORMATS:
        return None
    if key in ALLOWED_FORMATS_BY_PLATFORM[resolve_platform(platform).key]:
        return key
    return None


# --------------------------------------------------------------------------- #
# Goals
# --------------------------------------------------------------------------- #

GOAL_DIRECTIVES: Dict[str, str] = {
    "reach": "Maximise reach. Prioritise a strong opening and broad relatability.",
    "engagement": "Maximise engagement. Ask a real question and invite replies.",
    "education": "Teach something concrete the viewer can apply immediately.",
    "authority": "Build authority with a specific, defensible point of view.",
    "conversion": "Drive one clear conversion action without being pushy.",
    "community": "Speak to a shared identity so viewers feel recognised.",
    "trust": "Build trust through honesty about limits and real numbers.",
    "entertainment": "Prioritise surprise and momentum over instruction.",
}

DEFAULT_GOAL = "reach"


def resolve_goal(goal: Optional[str]) -> str:
    if not goal:
        return DEFAULT_GOAL
    key = goal.strip().lower().replace("-", "_").replace(" ", "_")
    return key if key in GOAL_DIRECTIVES else DEFAULT_GOAL


def goal_directive(goal: Optional[str]) -> str:
    return GOAL_DIRECTIVES[resolve_goal(goal)]


# --------------------------------------------------------------------------- #
# Lifecycle
# --------------------------------------------------------------------------- #

#: Module 18 fed live trends into this. Studio has no trend ingestion (that is a
#: Growth concern), so `lifecycle_hint` arrives from the creator or the frontend.
LIFECYCLE_DIRECTIVES: Dict[str, str] = {
    "emerging": "This is early and not yet saturated. Signal that you spotted it first.",
    "rising": "This is gaining momentum. Ride the wave without overstating it.",
    "peak": "This is saturated. Stand out by taking a distinct angle rather than repeating the obvious.",
    "declining": "Interest is fading. Either sharpen a contrarian take or skip it.",
    "evergreen": "This does not expire. Optimise for long-tail search and reference value.",
    "unknown": "",
}

_LIFECYCLE_ALIASES = {
    "new": "emerging",
    "trending": "rising",
    "hot": "peak",
    "saturated": "peak",
    "fading": "declining",
    "evergreen_content": "evergreen",
}


def resolve_lifecycle(stage: Optional[str]) -> Optional[str]:
    if not stage:
        return None
    key = stage.strip().lower().replace("-", "_").replace(" ", "_")
    key = _LIFECYCLE_ALIASES.get(key, key)
    return key if key in LIFECYCLE_DIRECTIVES else None


def lifecycle_directive(stage: Optional[str]) -> str:
    resolved = resolve_lifecycle(stage)
    return LIFECYCLE_DIRECTIVES[resolved] if resolved else ""


# --------------------------------------------------------------------------- #
# Timing
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class ScriptSlot:
    """One timed segment of a script."""
    role: str
    start_sec: int
    end_sec: int
    words: int
    note: str = ""

    @property
    def duration_sec(self) -> int:
        return self.end_sec - self.start_sec

    def as_dict(self) -> Dict[str, object]:
        return {
            "role": self.role,
            "start_sec": self.start_sec,
            "end_sec": self.end_sec,
            "duration_sec": self.duration_sec,
            "words": self.words,
            "note": self.note,
        }


#: Spoken delivery rate. Module 18 used 140-150 wpm as guidance for long form;
#: short form is spoken faster and tighter.
WORDS_PER_SECOND = 2.6          # ~156 wpm
LONG_FORM_WORDS_PER_SECOND = 2.4


def _value_slots(duration: int) -> int:
    """How many VALUE segments fit, per the donor's thresholds."""
    if duration <= 15:
        return 1
    if duration <= 60:
        return 2
    if duration <= 120:
        return 3
    return 4


def allocate_segments(
    duration_sec: int = 30,
    *,
    format_hint: Optional[str] = None,
) -> List[ScriptSlot]:
    """Build a contiguous HOOK/SETUP/VALUE…/PAYOFF/CTA skeleton.

    Ported from `lib/domain/timing.ts:10`. Two properties matter and are both
    tested:

    - segments are **contiguous** (each `start_sec` equals the previous
      `end_sec`), and
    - the final `end_sec` equals `duration_sec` **exactly**.

    The donor handled rounding by making the last VALUE slot absorb the
    remainder; that is kept because an off-by-one here silently produces a
    script that does not fit.
    """
    if duration_sec <= 0:
        return []
    duration_sec = int(duration_sec)

    hook_len = 2 if duration_sec <= 15 else 3
    cta_len = 3 if duration_sec <= 30 else 5
    # Never let the bookends eat the whole clip.
    hook_len = min(hook_len, max(1, duration_sec // 6))
    cta_len = min(cta_len, max(1, duration_sec // 6))

    middle = duration_sec - hook_len - cta_len
    if middle <= 0:
        # Degenerate short duration: one slot covers everything.
        return [ScriptSlot("HOOK", 0, duration_sec, _words(duration_sec),
                           "clip too short to segment")]

    setup_len = max(1, round(middle * 0.20))
    payoff_len = max(1, round(middle * 0.25))
    middle -= setup_len + payoff_len
    if middle < 1:
        setup_len = max(1, middle // 2)
        payoff_len = max(1, middle - setup_len)
        middle = middle - setup_len - payoff_len

    value_count = _value_slots(duration_sec)
    base = middle // value_count
    remainder = middle - base * value_count

    lengths: List[Tuple[str, int, str]] = [
        ("HOOK", hook_len, "Earn attention in the first seconds."),
        ("SETUP", setup_len, "Name the problem or tension."),
    ]
    for i in range(value_count):
        # The first VALUE absorbs the remainder so the slots stay contiguous.
        extra = remainder if i == 0 else 0
        lengths.append(("VALUE", base + extra, "Deliver a specific point."))
    lengths.append(("PAYOFF", payoff_len, "Land the insight or result."))
    lengths.append(("CTA", cta_len, "One clear next step."))

    slots: List[ScriptSlot] = []
    cursor = 0
    for role, length, note in lengths:
        slots.append(
            ScriptSlot(role, cursor, cursor + length, _words(length), note)
        )
        cursor += length

    # Guarantee the exact-duration contract regardless of rounding.
    if slots[-1].end_sec != duration_sec:
        last = slots[-1]
        slots[-1] = ScriptSlot(
            last.role, last.start_sec, duration_sec,
            _words(duration_sec - last.start_sec), last.note,
        )
    return slots


def _words(seconds: int) -> int:
    rate = WORDS_PER_SECOND
    return max(1, int(round(seconds * rate)))


def total_words(slots: List[ScriptSlot]) -> int:
    return sum(slot.words for slot in slots)


def format_duration(seconds: int) -> str:
    seconds = max(0, int(seconds))
    if seconds < 60:
        return f"{seconds}s"
    minutes, secs = divmod(seconds, 60)
    return f"{minutes}m {secs}s" if secs else f"{minutes}m"
