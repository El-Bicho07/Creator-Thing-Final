"""Context assembly — the single place creator context is built.

Adapted from Module 18 (Guruvelah), which assembled a memory block inside its own
route handler (`lib/ai/memory.ts:1`, consumed at `orchestrator.ts:55`). That is the
behaviour Studio must not repeat per capability: a donor-internal helper is how you
end up with two different notions of "the creator's context".

Studio inverts it. `ContextAssembler` is the **only** component that reads creator
context, and it reads it exclusively through Phase 2 services:

```text
ContextAssembler
   ├── LongTermMemoryEngine.retrieve_for_prompt()   (not pgvector directly)
   └── CreatorVoiceEngine.get_profile()             (not a voice-profile query)
```

Studio imports neither `sentence_transformers` nor the E5 model, and issues no
SQL against `chunks`. That keeps the Phase 2 dependency direction intact:

```text
Studio → LongTermMemoryEngine → EmbeddingService → E5-base
```

Every retrieved block passes through `app.studio.safety` so untrusted memory cannot
impersonate Studio's own framing.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.memory import MemoryEngine, MemoryQuery, get_memory_engine
from app.studio import safety
from app.voice import VoiceEngine, get_voice_engine

logger = get_logger(__name__)


@dataclass
class CreatorContext:
    """Assembled, injection-hardened creator context for one generation."""

    memory: str = ""
    voice: str = ""
    prior_work: str = ""
    brief: str = ""

    memory_used: int = 0
    prior_work_used: int = 0
    voice_available: bool = False
    notes: List[str] = field(default_factory=list)

    def summary(self) -> Dict[str, Any]:
        """Non-sensitive provenance for the API response."""
        return {
            "memory_chunks": self.memory_used,
            "prior_work_items": self.prior_work_used,
            "voice_available": self.voice_available,
            "notes": list(self.notes),
        }

    def prompt_variables(self) -> Dict[str, str]:
        """The blocks, ready to drop into a prompt template."""
        return {
            "creator_request": self.brief,
            "retrieved_memory": self.memory,
            "creator_voice": self.voice,
            "prior_work": self.prior_work,
        }


class ContextAssembler:
    """Builds `CreatorContext` from Phase 2 services.

    Failures degrade rather than raise: missing memory or an absent voice profile
    must not block generation. The degradation is recorded in `notes` so the
    creator sees *why* context was thin instead of silently getting worse output.
    """

    #: Bound on retrieved memory, so a large memory store cannot blow the prompt.
    MEMORY_TOP_K = 5
    MEMORY_MAX_CHARS = 3_000
    VOICE_MAX_CHARS = 1_200
    PRIOR_WORK_MAX_CHARS = 2_000

    def __init__(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        *,
        memory: Optional[MemoryEngine] = None,
        voice: Optional[VoiceEngine] = None,
    ) -> None:
        self._db = db
        self._user_id = user_id
        self._memory = memory
        self._voice = voice

    @property
    def memory_engine(self) -> MemoryEngine:
        if self._memory is None:
            self._memory = get_memory_engine(self._db, self._user_id)
        return self._memory

    @property
    def voice_engine(self) -> VoiceEngine:
        if self._voice is None:
            self._voice = get_voice_engine(self._db, self._user_id)
        return self._voice

    # ------------------------------------------------------------------ #
    # Public assembly
    # ------------------------------------------------------------------ #

    async def assemble(
        self,
        *,
        brief: str,
        query: Optional[str] = None,
        platform: Optional[str] = None,
        include_prior_work: bool = True,
        include_voice: bool = True,
        prior_work: Optional[List[Dict[str, Any]]] = None,
        max_memory: Optional[int] = None,
    ) -> CreatorContext:
        """Assemble full creator context.

        `query` is what memory is retrieved against; it defaults to the brief
        because in Studio they are nearly always the same text.
        """
        context = CreatorContext(
            brief=safety.wrap_brief(brief),
        )
        retrieval_query = (query or brief or "").strip()

        # ---- long-term memory ----
        if retrieval_query:
            await self._attach_memory(context, retrieval_query, max_memory)

        # ---- voice profile ----
        if include_voice:
            await self._attach_voice(context, retrieval_query)

        # ---- prior Studio work ----
        if include_prior_work:
            await self._attach_prior_work(context, prior_work)

        # Platform is context too: it changes what "good" means.
        if platform:
            context.notes.append(f"platform:{platform}")

        return context

    # ------------------------------------------------------------------ #
    # Parts
    # ------------------------------------------------------------------ #

    async def _attach_memory(
        self, context: CreatorContext, query: str, max_memory: Optional[int]
    ) -> None:
        try:
            hits = await self.memory_engine.retrieve(
                MemoryQuery(
                    query=query,
                    top_k=max_memory or self.MEMORY_TOP_K,
                    purpose="studio_context",
                )
            )
        except Exception as exc:
            # Memory is an enhancement. Never fail generation over it.
            logger.warning("Studio context: memory retrieval failed: %s", exc)
            context.notes.append("memory_unavailable")
            return

        if not hits:
            context.notes.append("no_relevant_memory")
            return

        lines: List[str] = []
        for hit in hits:
            title = hit.title or hit.source_type
            lines.append(f"- [{title}] {hit.text}")

        block = "\n".join(lines)
        # Untrusted: memory can contain pasted text that looks like instructions.
        wrapped = safety.wrap(
            "retrieved_memory", block, max_chars=self.MEMORY_MAX_CHARS
        )
        if wrapped:
            context.memory = wrapped
            context.memory_used = len(hits)
        else:
            context.notes.append("memory_empty_after_sanitisation")

    async def _attach_voice(self, context: CreatorContext, query: str) -> None:
        try:
            profile = await self.voice_engine.get_profile()
        except Exception as exc:
            logger.warning("Studio context: voice profile read failed: %s", exc)
            context.notes.append("voice_unavailable")
            return

        if not profile:
            context.notes.append("no_voice_profile")
            return

        rendered = self._render_voice(profile)
        wrapped = safety.wrap(
            "creator_voice", rendered, max_chars=self.VOICE_MAX_CHARS
        )
        if wrapped:
            context.voice = wrapped
            context.voice_available = True
        else:
            context.notes.append("voice_profile_empty")

    @staticmethod
    def _render_voice(profile: Dict[str, Any]) -> str:
        """Flatten a stored voice profile into prompt prose."""
        parts: List[str] = []
        style = profile.get("style_name")
        if style:
            parts.append(f"Voice style: {style}")

        tone = profile.get("tone_fingerprint") or {}
        if isinstance(tone, dict):
            for key, value in tone.items():
                if value in (None, "", [], {}):
                    continue
                parts.append(f"Tone {key}: {value}")

        characteristics = profile.get("writing_characteristics") or {}
        if isinstance(characteristics, dict):
            for key, value in characteristics.items():
                if value in (None, "", [], {}):
                    continue
                parts.append(f"Writing {key}: {value}")

        vocabulary = profile.get("vocabulary_patterns") or {}
        if isinstance(vocabulary, dict):
            keywords = vocabulary.get("top_keywords") or []
            if keywords:
                parts.append(f"Recurring vocabulary: {', '.join(map(str, keywords[:12]))}")

        rules = profile.get("formatting_rules") or []
        if rules:
            parts.append("Formatting rules: " + "; ".join(map(str, rules[:6])))

        forbidden = profile.get("forbidden_words") or []
        if forbidden:
            parts.append("Never use: " + ", ".join(map(str, forbidden[:20])))

        return "\n".join(parts)

    async def _attach_prior_work(
        self,
        context: CreatorContext,
        prior_work: Optional[List[Dict[str, Any]]],
    ) -> None:
        if prior_work is None:
            try:
                from app.studio.persistence import StudioRepository

                prior_work = await StudioRepository(
                    self._db, self._user_id
                ).list_prior_assets(limit=3)
            except Exception as exc:
                logger.warning("Studio context: prior work lookup failed: %s", exc)
                context.notes.append("prior_work_unavailable")
                return

        if not prior_work:
            context.notes.append("no_prior_work")
            return

        lines = [
            f"- [{item.get('title') or 'untitled'}] {(item.get('text') or '')[:400]}"
            for item in prior_work
        ]
        wrapped = safety.wrap(
            "prior_work", "\n".join(lines), max_chars=self.PRIOR_WORK_MAX_CHARS
        )
        if wrapped:
            context.prior_work = wrapped
            context.prior_work_used = len(prior_work)


def get_context_assembler(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    memory: Optional[MemoryEngine] = None,
    voice: Optional[VoiceEngine] = None,
) -> ContextAssembler:
    return ContextAssembler(db, user_id, memory=memory, voice=voice)
