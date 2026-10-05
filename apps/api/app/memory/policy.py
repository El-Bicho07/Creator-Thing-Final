"""Memory write policy (task §29).

**Do not save every LLM output.** Only information that will still be useful in a
future session is persisted. This module is the single decision point, so the
policy is auditable and testable rather than scattered through feature code.

The policy has two gates:

1. **Eligibility** -- is this a durable memory candidate at all?
2. **Redaction**  -- strip anything that must never enter a retrievable store.

Redaction matters because retrieved memory is fed back to the LLM and to
developers via logs. Credentials and personal identifiers must not be stored at
all, regardless of category.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.memory.schemas import MemoryCategory

#: Substrings that mark an LLM output as throwaway rather than durable.
TRANSIENT_MARKERS = (
    "let me know if",
    "here is a draft",
    "would you like me to",
    "i can't",
    "as an ai",
    "note: this is a test",
)

#: Patterns whose *values* must never be persisted.
_SECRET_PATTERNS: dict[str, re.Pattern[str]] = {
    "api_key": re.compile(
        r"(?i)\b(?:sk-|AIza)[A-Za-z0-9_\-]{16,}\b"
    ),
    "bearer": re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]{16,}"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_\-]{20,}"),
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]{2,}"),
    "phone": re.compile(r"(?<!\d)(?:\+?\d[\d \-()]{9,}\d)(?!\d)"),
    "credential_assignment": re.compile(
        r"(?i)\b(?:api[_-]?key|secret|password|passwd|token|access[_-]?key)"
        r"\s*[:=]\s*[\"']?[A-Za-z0-9_\-]{8,}[\"']?"
    ),
}


@dataclass(frozen=True)
class PolicyDecision:
    """Outcome of evaluating the write policy."""

    should_persist: bool
    category: MemoryCategory
    reasons: list[str] = field(default_factory=list)
    redacted: bool = False
    redacted_fields: list[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.should_persist


#: Categories that are always considered durable when the caller supplies them.
DURABLE_CATEGORIES = frozenset(MemoryCategory)


def redact(text: str) -> tuple[str, list[str]]:
    """Remove credential-shaped and personal-identifier values.

    Returns `(cleaned_text, removed_field_names)`.
    """
    if not text:
        return text, []
    cleaned = text
    removed: list[str] = []
    for name, pattern in _SECRET_PATTERNS.items():
        if pattern.search(cleaned):
            cleaned = pattern.sub(f"[redacted:{name}]", cleaned)
            removed.append(name)
    return cleaned, removed


def evaluate(
    text: str,
    category: MemoryCategory,
    *,
    min_length: int = 20,
    explicit_user_request: bool = False,
) -> PolicyDecision:
    """Decide whether `text` should be persisted as long-term memory.

    `explicit_user_request=True` means a human deliberately asked to remember
    this, which overrides the transient-content checks (but never redaction).
    """
    reasons: list[str] = []
    reasons_fields: list[str] = []

    if category not in DURABLE_CATEGORIES:
        reasons.append(f"unknown category: {category}")

    body = (text or "").strip()
    if not body:
        reasons.append("empty content")
    elif len(body) < min_length and not explicit_user_request:
        reasons.append(f"too short to be durable ({len(body)} < {min_length} chars)")

    if not explicit_user_request:
        lowered = body.lower()
        for marker in TRANSIENT_MARKERS:
            if marker in lowered:
                reasons.append(f"transient conversational filler: '{marker}'")
                break

    cleaned, removed = redact(body)
    if removed:
        reasons_fields = removed

    should_persist = not reasons
    if should_persist and removed:
        reasons.append(f"redacted before storing: {', '.join(removed)}")

    return PolicyDecision(
        should_persist=should_persist,
        category=category,
        reasons=reasons,
        redacted=bool(removed),
        redacted_fields=removed,
    )


def apply(text: str) -> str:
    """Convenience: return the redacted text."""
    return redact(text)[0]