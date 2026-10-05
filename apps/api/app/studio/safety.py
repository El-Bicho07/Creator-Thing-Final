"""Prompt-injection hardening for Studio.

Creator-supplied text and *retrieved* text are both untrusted input. Retrieved
long-term memory in particular may contain text a previous ingest wrote verbatim,
including text that looks like instructions.

Adapted from Module 18 (Guruvelah) `lib/prompts/base.ts:19`
(`sanitizeUserInput` / `wrapUserInput`), which used the same idea. The platform's
`app.llm.prompts.UNTRUSTED_DATA_PREAMBLE` states the trust boundary in the system
channel; this module makes sure untrusted text cannot *escape* its data channel in
the first place.

Two layers, because either alone is insufficient:

1. **Neutralise** tag-like delimiters, so untrusted text cannot close the
   `<retrieved_memory>` wrapper and impersonate our own framing.
2. **Wrap** in explicit delimiters, so the model can tell where data ends.

This is defence in depth, not a guarantee: a sufficiently clever model can still be
influenced by data. The boundary is meaningful because it removes the mechanical
escape and because the system channel states the rule explicitly.
"""
from __future__ import annotations

import re

#: Delimiters Studio uses for its own framing. Any occurrence of these inside
#: untrusted text is defanged so it cannot terminate our wrapper early.
_OWN_TAGS = (
    "retrieved_memory",
    "creator_voice",
    "creator_request",
    "studio_context",
    "prior_work",
)

_TAG_RE = re.compile(r"<\s*/?\s*([a-zA-Z_][a-zA-Z0-9_.-]*)")
_FENCE_RE = re.compile(r"```+")
_ROLE_MARKER_RE = re.compile(
    r"(?im)^\s*(system|assistant|user)\s*:\s*"
)


def neutralize(text: str | None, *, max_chars: int = 20_000) -> str:
    """Make untrusted text safe to place inside a delimited data block.

    Strips characters that let the text break out of its wrapper, collapses
    markdown code fences (which can visually spoof structure), and neutralises
    role markers at the start of a line.
    """
    if not text:
        return ""

    cleaned = text[:max_chars]

    # Defang our own delimiters: <retrieved_memory> -> [retrieved_memory]
    def _defang(match: "re.Match[str]") -> str:
        tag = match.group(1)
        if tag.lower() in _OWN_TAGS:
            return f"[{tag}]"
        # Any other angle-bracket tag is also neutralised: it is not something we
        # put there, and leaving it invites the model to read structure we never
        # intended to convey.
        return f"[{tag}]"

    cleaned = _TAG_RE.sub(_defang, cleaned)
    cleaned = _FENCE_RE.sub("", cleaned)
    cleaned = _ROLE_MARKER_RE.sub(lambda m: f"{m.group(1)} (quoted data) :", cleaned)

    return cleaned.strip()


def wrap(label: str, text: str | None, *, max_chars: int = 20_000) -> str:
    """Wrap already-neutralised text in an explicit data delimiter.

    An empty or absent value returns an empty string rather than an empty
    labelled block, so prompts don't carry empty sections that invite the model
    to fill them in.
    """
    safe = neutralize(text, max_chars=max_chars)
    if not safe:
        return ""
    if label not in _OWN_TAGS:
        raise ValueError(f"unknown context label: {label!r}")
    return f"<{label}>\n{safe}\n</{label}>"


def wrap_brief(text: str | None, *, max_chars: int = 8_000) -> str:
    """Wrap the creator's own request.

    The creator is trusted in the sense that they are the authenticated owner of
    the session, but their text is still passed through the same neutralisation:
    a brief is frequently pasted from an untrusted source, and it should not be
    able to impersonate our framing either.
    """
    return wrap("creator_request", text, max_chars=max_chars)
