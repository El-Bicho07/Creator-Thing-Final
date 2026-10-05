"""Output validation, coercion and hygiene.

Three donor ideas, deliberately separated by what they actually guarantee:

1. **Shape coercion** — adapted from Module 08 `app.py:81`
   (`coerce_shape`/`parse_json`). Salvages a valid JSON object from fenced or
   noisy output. This is about *getting parseable text*, not about content.

2. **Deterministic realignment / clamping** — adapted from Module 03
   `gemini.ts:193` (realign to N mandatory slots) and Module 01 `ideaChain.js:139`
   (clamp numeric scores and enum fields with deterministic fallbacks). The donor's
   insight was that a model asked for N items will sometimes return N-1, and that
   the honest fix is to make the *contract* hold rather than to retry forever.

3. **Hygiene** — adapted from Module 01 `ideaChain.js:126`: strip AI filler,
   emoji and em-dash padding. Applied to short headline-style outputs only;
   stripping punctuation out of a long script would damage the prose.

A deliberate non-goal: the anti-fabrication guarantee is enforced by *prompt*
instruction (Module 03's statistic rule), not by a validator, because no amount of
schema checking can tell whether a specific number is true.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List, Optional, Sequence

# --------------------------------------------------------------------------- #
# JSON salvage
# --------------------------------------------------------------------------- #

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def extract_json_object(raw: str) -> Dict[str, Any]:
    """Parse a JSON object out of model output, tolerating wrappers.

    Order matters: try the whole string, then fenced blocks, then the outermost
    braces. Raises `ValueError` when nothing parses, so the caller can decide
    whether to retry (the Gateway owns bounded retry).
    """
    if not raw or not raw.strip():
        raise ValueError("empty model output")

    candidates: List[str] = [raw.strip()]
    candidates.extend(m.group(1).strip() for m in _FENCE_RE.finditer(raw))
    for match in re.finditer(r"\{", raw):
        start = match.start()
        for end in range(len(raw), start, -1):
            if raw[end - 1] != "}":
                continue
            candidates.append(raw[start:end])
            break

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list):
            return {"items": parsed}

    raise ValueError("model output contained no JSON object")


def coerce_to_dict(value: Any) -> Dict[str, Any]:
    """Accept the several shapes a model result can arrive in."""
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, list):
        return {"items": value}
    raise ValueError(f"cannot coerce {type(value).__name__} to a dict")


# --------------------------------------------------------------------------- #
# Scalar clamping
# --------------------------------------------------------------------------- #

def clamp(value: Any, low: float, high: float, default: float) -> float:
    """Clamp a model-supplied number, falling back deterministically.

    Module 01 did exactly this for its virality score. A model returning 55-98
    sometimes emits 120 or "high"; clamping is both safer and more predictable
    than a retry.
    """
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number != number:  # NaN
        return default
    return max(low, min(high, number))


def require_str(
    value: Any,
    *,
    field: str,
    max_length: int = 4_000,
    fallback: str = "",
) -> str:
    """Coerce to a non-empty, length-bounded string."""
    if not isinstance(value, str):
        value = "" if value is None else str(value)
    cleaned = value.strip()
    if not cleaned:
        return fallback
    return cleaned[:max_length]


def coerce_enum(
    value: Any,
    allowed: Sequence[str],
    *,
    default: str,
    lowercase: bool = True,
) -> str:
    """Snap a model value onto an allowed set, deterministically."""
    if isinstance(value, str):
        candidate = value.strip().lower() if lowercase else value.strip()
        if candidate in allowed:
            return candidate
        # Tolerate simple morphological variants the models actually emit.
        normalised = candidate.replace("-", "_").replace(" ", "_")
        if normalised in allowed:
            return normalised
    return default


def as_list(value: Any, *, max_items: int = 20) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)[:max_items]
    return [value]


# --------------------------------------------------------------------------- #
# Slot realignment (Module 03)
# --------------------------------------------------------------------------- #

def realign_slots(
    items: Sequence[Any],
    *,
    styles: Sequence[str],
    key: str = "style",
    text_key: str = "text",
) -> List[Dict[str, str]]:
    """Force exactly one item per mandatory style, in a known order.

    Adapted from Module 03 `src/lib/gemini.ts:193`, which realigned hook output to
    its ten mandatory styles by style match, then positional fallback, then a
    templated placeholder — followed by a hard count assertion.

    A placeholder is emitted rather than a short result because a capability
    contract that promises N items must return N items; silently returning seven
    would break the frontend's per-style rendering.
    """
    by_style: Dict[str, Any] = {}
    positional: List[Any] = []
    for item in items:
        if isinstance(item, dict):
            style = coerce_enum(item.get(key), styles, default="")
            if style and style not in by_style:
                by_style[style] = item
            positional.append(item)
        else:
            positional.append(item)

    out: List[Dict[str, str]] = []
    for index, style in enumerate(styles):
        source = by_style.get(style)
        if source is None and index < len(positional):
            candidate = positional[index]
            if isinstance(candidate, dict):
                # Positional fallback: adopt the text, retag with the right style.
                source = candidate
            else:
                source = {text_key: str(candidate)}
        text = require_str(
            (source or {}).get(text_key),
            field=f"{style}.{text_key}",
            fallback="",
        ) if isinstance(source, dict) else ""

        out.append(
            {
                key: style,
                text_key: text or f"[{style.replace('_', ' ')} hook pending]",
            }
        )
    return out


# --------------------------------------------------------------------------- #
# Hygiene (Module 01)
# --------------------------------------------------------------------------- #

#: Module 01's `BANNED_WORDS` idea: strip the vocabulary that makes AI writing
#: recognisable. Kept as a small list and applied only to headline-style output.
AI_FILLER_RE = re.compile(
    r"\b("
    r"delve into|unlock the secrets?|"
    r"game[- ]chang(?:er|ing)|"
    r"in today's (?:fast[- ]paced|digital|modern) world|"
    r"it's important to note that|when it comes to|ever[- ]evolving|"
    r"landscape|testament to|leverage the power of|elevate your|"
    r"navigate the world of|in the realm of|realm of"
    r")\b",
    re.IGNORECASE,
)
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)
_EM_DASH_RE = re.compile(r"\s*[—–]\s*")


def clean_headline(text: str, *, max_chars: int = 120) -> str:
    """Light hygiene for short headline-style output.

    Deliberately conservative. For long prose this would be vandalism, so callers
    only apply it to hook/title/caption-openers.
    """
    if not text:
        return ""
    cleaned = AI_FILLER_RE.sub("", text)
    cleaned = _EMOJI_RE.sub("", cleaned)
    cleaned = _EM_DASH_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -:;,")
    if len(cleaned) > max_chars:
        cut = cleaned[:max_chars].rsplit(" ", 1)[0]
        cleaned = (cut or cleaned[:max_chars]).rstrip(" ,.;:-")
    return cleaned


# --------------------------------------------------------------------------- #
# Heuristic ranking (Module 08)
# --------------------------------------------------------------------------- #

def score_caption(text: str, *, keywords: Sequence[str] = ()) -> float:
    """Deterministic 0-10 heuristic caption score.

    Adapted from Module 08's `heuristic_pick` (`app.py:359`), which ranked four
    caption variants on five signals without an LLM call. Cheap, explainable, and
    it gives the creator a default recommendation they can override.
    """
    if not text:
        return 0.0
    stripped = text.strip()
    score = 0.0

    # 1. Hook length: a long first line is a scroll-stopper; very long is not.
    first_line = stripped.splitlines()[0] if stripped.splitlines() else stripped
    if 40 <= len(first_line) <= 125:
        score += 2.5
    elif 25 <= len(first_line) <= 150:
        score += 1.2

    # 2. Some call to action.
    if re.search(r"\b(comment|save|share|follow|subscribe|link|dm|tap|drop)\b",
                 stripped, re.IGNORECASE):
        score += 2.0

    # 3. Hashtag discipline: 1-5 beats a wall of tags.
    hashtags = re.findall(r"#\w+", stripped)
    if 1 <= len(hashtags) <= 5:
        score += 1.5
    elif len(hashtags) > 12:
        score -= 1.0

    # 4. Keyword presence (topic relevance).
    for keyword in keywords:
        if keyword and keyword.lower() in stripped.lower():
            score += 1.0
            break

    # 5. Save/share trigger — a concrete takeaway worth keeping.
    if re.search(r"\b(save this|keep this|here's how|the trick is|the reason|"
                 r"most people|stop doing)\b", stripped, re.IGNORECASE):
        score += 1.5

    return round(max(0.0, min(10.0, score)), 2)


def rank_candidates(
    items: Sequence[Dict[str, Any]],
    *,
    text_key: str,
    keywords: Sequence[str] = (),
    scorer: Optional[Callable[[Dict[str, Any]], float]] = None,
) -> List[Dict[str, Any]]:
    """Score and order candidates, attaching `score` and `rank` to each.

    Ties keep their original order (Python's sort is stable), which is the
    deterministic behaviour the donor relied on.
    """
    scored: List[Dict[str, Any]] = []
    for item in items:
        text = require_str(item.get(text_key), field=text_key)
        value = scorer(item) if scorer else score_caption(text, keywords=keywords)
        scored.append({**item, "score": value})

    scored.sort(key=lambda i: -float(i["score"]))
    for position, item in enumerate(scored, start=1):
        item["rank"] = position
    return scored


# --------------------------------------------------------------------------- #
# Structural validation (Module 18)
# --------------------------------------------------------------------------- #

def validate_segments(
    segments: Sequence[Dict[str, Any]],
    *,
    expected_duration: Optional[int] = None,
) -> List[str]:
    """Check script segments against the structural contract.

    Adapted from Module 18 (Guruvelah) `lib/ai/validators.ts:31`, which required
    a HOOK first, a CTA last, at least three segments, and an end time equal to the
    requested duration. Returns a list of human-readable problems; an empty list
    means valid. The caller decides whether to surface or retry.
    """
    problems: List[str] = []
    if len(segments) < 3:
        problems.append(f"expected at least 3 segments, got {len(segments)}")

    roles = [
        str(seg.get("role", "")).strip().lower()
        for seg in segments
        if isinstance(seg, dict)
    ]
    if roles:
        if roles[0] != "hook":
            problems.append(f"first segment must be HOOK, got {roles[0] or 'empty'}")
        if roles[-1] != "cta":
            problems.append(f"last segment must be CTA, got {roles[-1] or 'empty'}")

    for seg in segments:
        if not isinstance(seg, dict):
            continue
        text = require_str(seg.get("text"), field="segment.text")
        if not text:
            problems.append(f"segment {seg.get('role', '?')} has empty text")

    # Every explicit timing value must be numeric, not just the last one: a
    # non-numeric end_sec anywhere makes the segment plan unusable downstream.
    for seg in segments:
        if not isinstance(seg, dict):
            continue
        for field in ("start_sec", "end_sec"):
            value = seg.get(field)
            if value is None:
                continue
            try:
                int(value)
            except (TypeError, ValueError):
                problems.append(
                    f"segment {seg.get('role', '?')} has a non-numeric {field}"
                )

    if expected_duration:
        last = segments[-1] if segments else None
        if isinstance(last, dict):
            end = last.get("end_sec")
            if end is not None:
                try:
                    if int(end) != int(expected_duration):
                        problems.append(
                            f"final segment ends at {end}s, expected {expected_duration}s"
                        )
                except (TypeError, ValueError):
                    pass  # already reported as non-numeric above

    return problems


def validate_unique_non_empty(
    items: Sequence[Any], *, key: str, expected: Optional[int] = None
) -> List[str]:
    """Require unique, non-empty values, optionally at an exact count."""
    problems: List[str] = []
    seen = set()
    empties = 0
    for item in items:
        value = ""
        if isinstance(item, dict):
            value = require_str(item.get(key), field=key)
        elif item is not None:
            value = str(item).strip()
        if not value:
            empties += 1
            continue
        seen.add(value.lower())

    duplicates = len(items) - empties - len(seen)
    if duplicates > 0:
        problems.append(f"{duplicates} duplicate {key} value(s)")
    if empties:
        problems.append(f"{empties} empty {key} value(s)")
    if expected is not None and len(items) != expected:
        problems.append(f"expected {expected} items, got {len(items)}")
    return problems
