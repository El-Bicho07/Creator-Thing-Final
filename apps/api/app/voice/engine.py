"""Creator Voice Engine.

Adapted from Module 13 `13_Voice_Replicator` per `docs/porting-log.md`.

Kept (ADAPT):
  * deterministic, dependency-light feature extraction -- sentence rhythm,
    emoji, pronoun usage, CTA / educational / promotional / storytelling
    vocabulary, hashtag behaviour, formatting habits. These are computed from the
    text itself, so they are reproducible and do not need a provider.
  * profile aggregation into a tone/vocabulary/formatting fingerprint
  * voice-match scoring of a draft against a stored profile

Dropped (REBUILD / PARK):
  * donor hash-vectorizer "embedding service" -> unified `EmbeddingService`
  * donor direct `google-genai` calls -> `LLMGateway`
  * donor `project_id`-keyed tables -> platform `voice_profiles` (RLS-scoped)

The engine never imports `sentence_transformers` and never names an embedding
model: where embeddings are needed it calls `EmbeddingService`.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any, Optional, Sequence

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embedding import EmbeddingService, get_embedding_service
from app.llm import LLMGateway, LLMRequest
from app.llm.providers.mock import MockLLMProvider

logger = logging.getLogger(__name__)


# =============================================================================
# Deterministic feature extraction (adapted from Module 13 text_analyzer.py)
# =============================================================================

EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)
HASHTAG_RE = re.compile(r"#[\w]+")
WORD_RE = re.compile(r"\b[\w']+\b")
SENTENCE_RE = re.compile(r"[.!?]+")

FIRST_PERSON = {"i", "me", "my", "mine", "myself", "we", "us", "our", "ours"}
SECOND_PERSON = {"you", "your", "yours", "yourself", "yourselves"}

CTA_KEYWORDS = {
    "comment below", "link in bio", "click the link", "share this",
    "save this post", "save for later", "tag a friend", "dm me",
    "send a message", "let me know", "what do you think", "follow for more",
    "swipe left", "tell me in the comments", "tap the link", "subscribe",
}
EDUCATIONAL_KEYWORDS = {
    "how", "why", "step", "guide", "tip", "learn", "mistake", "secret",
    "best", "tool", "framework", "tutorial",
}
PROMOTIONAL_KEYWORDS = {
    "offer", "buy", "sale", "discount", "course", "service", "available",
    "launch", "limited", "price", "sign up",
}
STORYTELLING_KEYWORDS = {
    "years ago", "when i", "remember", "story", "journey", "learned",
    "failed", "realized", "turned out",
}

#: Vocabulary typical of formal / legal / institutional register.
FORMAL_KEYWORDS = {
    "pursuant", "shall", "aforementioned", "clause", "schedule", "documentation",
    "administrator", "registrant", "entity", "attestation", "compliance",
    "mandatory", "hereby", "notwithstanding", "witnesseth", "hereinafter",
    "thereof", "therein", "aforesaid", "pursuant to", "in accordance",
    "shall be", "must be", "is required", "prior to", "subject to",
}

#: Contractions are a strong informal-register signal.
CONTRACTION_RE = re.compile(r"\b\w+'(?:t|re|ve|ll|d|m|s)\b", re.IGNORECASE)

TONE_AXES = (
    "formality", "conversational", "educational", "promotional", "storytelling",
)


class VoiceFeatures(BaseModel):
    """Per-sample deterministic writing characteristics."""

    char_count: int = 0
    word_count: int = 0
    sentence_count: int = 0
    paragraph_count: int = 0
    avg_sentence_length: float = 0.0
    avg_word_length: float = 0.0
    emoji_count: int = 0
    hashtag_count: int = 0
    first_person_ratio: float = 0.0
    second_person_ratio: float = 0.0
    formality_score: float = 0.5
    conversational_score: float = 0.5
    educational_score: float = 0.5
    promotional_score: float = 0.2
    storytelling_score: float = 0.3
    cta_count: int = 0
    question_count: int = 0
    exclamation_count: int = 0


def extract_features(text: str) -> VoiceFeatures:
    """Compute deterministic writing characteristics for one sample."""
    body = text or ""
    words = WORD_RE.findall(body.lower())
    sentences = [s.strip() for s in SENTENCE_RE.split(body) if s.strip()]
    paragraphs = [p for p in re.split(r"\n\s*\n", body) if p.strip()]
    lowered = body.lower()

    word_count = len(words)
    sentence_count = max(1, len(sentences))
    token_set = set(words)

    def ratio(keywords: set[str]) -> float:
        if word_count == 0:
            return 0.0
        hits = sum(1 for w in words if w in keywords)
        return round(min(1.0, hits / max(1, sentence_count)), 4)

    cta_count = sum(1 for phrase in CTA_KEYWORDS if phrase in lowered)

    return VoiceFeatures(
        char_count=len(body),
        word_count=word_count,
        # Uses the same >=1 value as the divisor below so that
        # avg_sentence_length == word_count / sentence_count always holds.
        sentence_count=sentence_count,
        paragraph_count=max(1, len(paragraphs)),
        avg_sentence_length=round(word_count / sentence_count, 3),
        avg_word_length=round(
            sum(len(w) for w in words) / word_count, 3) if word_count else 0.0,
        emoji_count=len(EMOJI_RE.findall(body)),
        hashtag_count=len(HASHTAG_RE.findall(body)),
        first_person_ratio=round(
            len(token_set & FIRST_PERSON) / max(1, len(FIRST_PERSON)), 4)
        if token_set else 0.0,
        second_person_ratio=round(
            len(token_set & SECOND_PERSON) / max(1, len(SECOND_PERSON)), 4)
        if token_set else 0.0,
        formality_score=_clamp(
            0.15
            + 0.45 * _word_length_score(words)
            + 0.55 * _phrase_ratio(body, FORMAL_KEYWORDS, sentences)
            - 0.20 * ratio(CTA_KEYWORDS)
            - 0.15 * (len(EMOJI_RE.findall(body)) / max(1, word_count)) * 10
            + 0.10 * _contraction_ratio(body)
        ),
        conversational_score=_clamp(
            0.15
            + 0.30 * len(token_set & FIRST_PERSON)
            + 0.12 * len(EMOJI_RE.findall(body))
            + 0.30 * _contraction_ratio(body)
            + 0.20 * ratio(CTA_KEYWORDS)
            - 0.30 * _phrase_ratio(body, FORMAL_KEYWORDS, sentences)),
        educational_score=_clamp(ratio(EDUCATIONAL_KEYWORDS)),
        promotional_score=_clamp(ratio(PROMOTIONAL_KEYWORDS)),
        storytelling_score=_clamp(ratio(STORYTELLING_KEYWORDS)),
        cta_count=cta_count,
        question_count=body.count("?"),
        exclamation_count=body.count("!"),
    )


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return round(max(low, min(high, value)), 4)


def _word_length_score(words: list[str]) -> float:
    """0.0 for short everyday words, ->1.0 for long polysyllabic ones.

    Register is a strong function of word length: "aforementioned" vs "fix".
    """
    if not words:
        return 0.0
    avg = sum(len(w) for w in words) / len(words)
    return _clamp((avg - 3.5) / 5.0)


def _phrase_ratio(body: str, phrases: set[str], sentences: list[str]) -> float:
    """Occurrences of register phrases per sentence, squashed into 0..1."""
    if not sentences:
        return 0.0
    lowered = body.lower()
    hits = sum(lowered.count(phrase) for phrase in phrases)
    return _clamp(hits / max(1, len(sentences)) / 3.0)


def _contraction_ratio(body: str) -> float:
    matches = CONTRACTION_RE.findall(body)
    words = WORD_RE.findall(body)
    if not words:
        return 0.0
    return _clamp(len(matches) / (len(words) / 20.0))


# =============================================================================
# Profile aggregation
# =============================================================================

class VoiceProfile(BaseModel):
    """Canonical creator voice profile (maps to `voice_profiles`)."""

    style_name: str = "Primary Style"
    tone_fingerprint: dict[str, float] = Field(default_factory=dict)
    writing_characteristics: dict[str, float] = Field(default_factory=dict)
    vocabulary_patterns: dict[str, Any] = Field(default_factory=dict)
    formatting_rules: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)
    sample_count: int = 0
    confidence: float = 0.0


def aggregate_profile(samples: Sequence[str], *,
                      style_name: str = "Primary Style",
                      forbidden_words: Optional[Sequence[str]] = None
                      ) -> VoiceProfile:
    """Aggregate per-sample features into one fingerprint.

    Confidence rises with sample count and saturates: one sample is not a voice.
    """
    usable = [s for s in samples if s and s.strip()]
    if not usable:
        return VoiceProfile(style_name=style_name, confidence=0.0)

    features = [extract_features(s) for s in usable]
    tone = {
        axis: round(sum(getattr(f, f"{axis}_score") for f in features) / len(features), 4)
        for axis in TONE_AXES
    }
    characteristics = {
        "avg_sentence_length": round(
            sum(f.avg_sentence_length for f in features) / len(features), 3),
        "avg_word_length": round(
            sum(f.avg_word_length for f in features) / len(features), 3),
        "emoji_rate": round(
            sum(f.emoji_count for f in features) / max(1, len(features)), 3),
        "hashtag_rate": round(
            sum(f.hashtag_count for f in features) / max(1, len(features)), 3),
        "paragraph_rate": round(
            sum(f.paragraph_count for f in features) / max(1, len(features)), 3),
        "question_rate": round(
            sum(f.question_count for f in features) / max(1, len(features)), 3),
        "exclamation_rate": round(
            sum(f.exclamation_count for f in features) / max(1, len(features)), 3),
        "first_person": round(
            sum(f.first_person_ratio for f in features) / len(features), 4),
        "second_person": round(
            sum(f.second_person_ratio for f in features) / len(features), 4),
    }

    words = [w for s in usable for w in WORD_RE.findall(s.lower())]
    top_keywords = _top(words, 12)
    frequent_phrases = _top_phrases(usable, 8)

    formatting = []
    if characteristics["avg_sentence_length"] < 12:
        formatting.append("short_sentences")
    if characteristics["paragraph_rate"] >= 2:
        formatting.append("multi_paragraph")
    if characteristics["emoji_rate"] >= 0.5:
        formatting.append("emoji_frequent")
    if characteristics["hashtag_rate"] <= 0.2:
        formatting.append("sparse_hashtags")
    if characteristics["first_person"] > 0.2:
        formatting.append("first_person_narrative")

    return VoiceProfile(
        style_name=style_name,
        tone_fingerprint=tone,
        writing_characteristics=characteristics,
        vocabulary_patterns={
            "top_keywords": top_keywords,
            "frequent_phrases": frequent_phrases,
            "vocabulary_richness": _richness(words),
        },
        formatting_rules=formatting,
        # Deliberately NOT derived from frequent words. A creator's own most
        # common vocabulary is not "forbidden"; auto-deriving it produced
        # violations like "contains flagged vocabulary: 'the'". Only words the
        # creator explicitly bans belong here.
        forbidden_words=sorted({w.strip().lower() for w in (forbidden_words or []) if w.strip()}),
        sample_count=len(usable),
        confidence=round(min(1.0, len(usable) / 10.0), 3),
    )


def _top(words: list[str], n: int, exclude: Optional[set[str]] = None) -> list[str]:
    from collections import Counter
    counts = Counter(w for w in words if len(w) > 2 and w not in (exclude or set()))
    return [w for w, _ in counts.most_common(n)]


def _top_phrases(samples: Sequence[str], n: int) -> list[str]:
    from collections import Counter
    counter: Counter[str] = Counter()
    for sample in samples:
        for sentence in SENTENCE_RE.split(sample):
            cleaned = " ".join(WORD_RE.findall(sentence.lower()))
            if len(cleaned.split()) >= 3:
                counter[cleaned] += 1
    return [phrase for phrase, count in counter.most_common(n) if count > 1]


def _richness(words: list[str]) -> float:
    """Type-token ratio scaled into 0..1; a proxy for vocabulary variety."""
    if not words:
        return 0.0
    return round(min(1.0, len(set(words)) / max(1, len(words))), 4)


# =============================================================================
# Voice-match validation
# =============================================================================

class VoiceMatch(BaseModel):
    overall_score: float = 0.0
    tone_delta: dict[str, float] = Field(default_factory=dict)
    characteristics_delta: dict[str, float] = Field(default_factory=dict)
    rule_violations: list[str] = Field(default_factory=list)
    verdict: str = "unknown"


def validate_voice_match(draft: str, profile: VoiceProfile,
                         tolerance: float = 0.35) -> VoiceMatch:
    """Score a draft against a profile.

    Deterministic and dependency-free, so it works without any provider
    credential. A higher score means closer stylistic alignment.
    """
    features = extract_features(draft)
    draft_tone = {axis: getattr(features, f"{axis}_score") for axis in TONE_AXES}

    tone_delta = {
        axis: round(abs(draft_tone[axis] - profile.tone_fingerprint.get(axis, 0.5)), 4)
        for axis in TONE_AXES
    }
    draft_chars = {
        "avg_sentence_length": features.avg_sentence_length,
        "avg_word_length": features.avg_word_length,
        "question_rate": float(features.question_count),
        "exclamation_rate": float(features.exclamation_count),
    }
    char_delta = {
        key: round(abs(value - profile.writing_characteristics.get(key, value)), 4)
        for key, value in draft_chars.items()
    }

    # Penalise average absolute deviation; normalise sentence-length deltas by
    # magnitude so a 4-word swing is not treated like a 0.1 tone swing.
    tone_penalty = sum(tone_delta.values()) / max(1, len(tone_delta))
    length_scale = max(1.0, profile.writing_characteristics.get("avg_sentence_length", 12.0))
    length_penalty = min(
        1.0,
        char_delta.get("avg_sentence_length", 0.0) / length_scale,
    )
    overall = _clamp(1.0 - (0.75 * tone_penalty + 0.25 * length_penalty))

    violations: list[str] = []
    lowered = (draft or "").lower()
    for word in profile.forbidden_words:
        if word and word in lowered:
            violations.append(f"contains flagged vocabulary: '{word}'")
    if profile.formatting_rules and "sparse_hashtags" in profile.formatting_rules \
            and features.hashtag_count > 3:
        violations.append("too many hashtags for this profile")
    if profile.formatting_rules and "short_sentences" in profile.formatting_rules \
            and features.avg_sentence_length > 20:
        violations.append("sentences are longer than this profile prefers")

    if overall >= 0.75 and not violations:
        verdict = "strong_match"
    elif overall >= 0.5:
        verdict = "partial_match"
    else:
        verdict = "weak_match"

    return VoiceMatch(
        overall_score=overall,
        tone_delta=tone_delta,
        characteristics_delta=char_delta,
        rule_violations=violations,
        verdict=verdict,
    )


# =============================================================================
# Persisted engine (RLS-scoped `voice_profiles`)
# =============================================================================

class VoiceEngine:
    """Shared creator voice capability.

    Uses `EmbeddingService` (for nearest-sample retrieval) and `LLMGateway` (for
    optional natural-language profile synthesis). It never creates its own
    vector store, LLM client or auth path.
    """

    def __init__(self, db: AsyncSession, user_id: uuid.UUID,
                 embedding: Optional[EmbeddingService] = None,
                 gateway: Optional[LLMGateway] = None) -> None:
        self._db = db
        self._user_id = uuid.UUID(str(user_id))
        self._embedding = embedding or get_embedding_service()
        self._gateway = gateway

    # -- persistence -------------------------------------------------------

    #: The profile treated as canonical when no style name is given.
    PRIMARY_STYLE = "Primary Style"

    async def save_profile(self, profile: VoiceProfile) -> uuid.UUID:
        """Upsert one named profile. A creator may keep several styles."""
        profile_id = uuid.uuid4()
        await self._db.execute(
            text(
                """
                INSERT INTO voice_profiles (
                    id, user_id, style_name, pacing_score, vocabulary_richness,
                    tone_fingerprint, formatting_rules, forbidden_words, sample_texts
                ) VALUES (
                    :id, :user_id, :style_name, :pacing, :richness,
                    CAST(:tone AS jsonb), CAST(:formatting AS jsonb),
                    CAST(:forbidden AS jsonb), CAST(:samples AS jsonb)
                )
                ON CONFLICT (user_id, style_name) DO UPDATE SET
                    style_name = EXCLUDED.style_name,
                    pacing_score = EXCLUDED.pacing_score,
                    vocabulary_richness = EXCLUDED.vocabulary_richness,
                    tone_fingerprint = EXCLUDED.tone_fingerprint,
                    formatting_rules = EXCLUDED.formatting_rules,
                    forbidden_words = EXCLUDED.forbidden_words,
                    sample_texts = EXCLUDED.sample_texts,
                    updated_at = NOW()
                RETURNING id
                """
            ),
            {
                "id": str(profile_id),
                "user_id": str(self._user_id),
                "style_name": profile.style_name,
                # pacing: shorter sentences read as faster pacing
                "pacing": _clamp(1.0 - (profile.writing_characteristics
                                        .get("avg_sentence_length", 14.0) / 40.0)),
                "richness": profile.vocabulary_patterns.get("vocabulary_richness", 0.0),
                "tone": json.dumps(profile.tone_fingerprint),
                "formatting": json.dumps(profile.formatting_rules),
                "forbidden": json.dumps(profile.forbidden_words),
                "samples": json.dumps(
                    {"writing_characteristics": profile.writing_characteristics,
                     "vocabulary_patterns": profile.vocabulary_patterns,
                     "sample_count": profile.sample_count,
                     "confidence": profile.confidence}),
            },
        )
        await self._db.commit()
        return profile_id

    async def get_profile(self, style_name: Optional[str] = None) -> Optional[dict[str, Any]]:
        """Fetch a named profile, or the canonical one by default."""
        # Built conditionally rather than using a nullable parameter: PostgreSQL
        # cannot infer the type of `NULL` in `:p IS NOT NULL AND col = :p`.
        if style_name is None:
            clause = "AND style_name = :style_name"
            params = {"user_id": str(self._user_id), "style_name": self.PRIMARY_STYLE}
        else:
            clause = "AND style_name = :style_name"
            params = {"user_id": str(self._user_id), "style_name": style_name}

        result = await self._db.execute(
            text(
                f"""
                SELECT id, style_name, pacing_score, vocabulary_richness,
                       tone_fingerprint, formatting_rules, forbidden_words,
                       sample_texts, created_at, updated_at
                FROM voice_profiles
                WHERE user_id = :user_id {clause}
                """
            ),
            params,
        )
        row = result.mappings().one_or_none()
        if row is None:
            return None
        payload = dict(row)
        samples = payload.pop("sample_texts") or {}
        payload["writing_characteristics"] = samples.get("writing_characteristics", {})
        payload["vocabulary_patterns"] = samples.get("vocabulary_patterns", {})
        payload["sample_count"] = samples.get("sample_count", 0)
        payload["confidence"] = samples.get("confidence", 0.0)
        return payload

    async def list_profiles(self) -> list[dict[str, Any]]:
        result = await self._db.execute(
            text(
                """
                SELECT id, style_name, pacing_score, vocabulary_richness,
                       tone_fingerprint, created_at, updated_at
                FROM voice_profiles
                WHERE user_id = :user_id
                ORDER BY (style_name = :primary) DESC, updated_at DESC
                """
            ),
            {"user_id": str(self._user_id), "primary": self.PRIMARY_STYLE},
        )
        return [
            {
                "id": str(r["id"]),
                "style_name": r["style_name"],
                "pacing_score": r["pacing_score"],
                "vocabulary_richness": r["vocabulary_richness"],
                "tone_fingerprint": r["tone_fingerprint"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "is_primary": r["style_name"] == self.PRIMARY_STYLE,
            }
            for r in result.mappings().all()
        ]

    async def delete_profile(self, style_name: Optional[str] = None) -> dict[str, int]:
        if style_name is None:
            result = await self._db.execute(
                text("DELETE FROM voice_profiles WHERE user_id = :user_id RETURNING id"),
                {"user_id": str(self._user_id)},
            )
        else:
            result = await self._db.execute(
                text(
                    """
                    DELETE FROM voice_profiles
                    WHERE user_id = :user_id AND style_name = :style_name
                    RETURNING id
                    """
                ),
                {"user_id": str(self._user_id), "style_name": style_name},
            )
        deleted = len(result.fetchall())
        await self._db.commit()
        return {"profiles_deleted": deleted}

    # -- higher level capabilities ----------------------------------------

    async def create_profile_from_samples(
        self,
        samples: Sequence[str],
        style_name: Optional[str] = None,
        forbidden_words: Optional[Sequence[str]] = None,
    ) -> VoiceProfile:
        """Aggregate samples and persist the profile."""
        profile = aggregate_profile(
            samples,
            style_name=style_name or self.PRIMARY_STYLE,
            forbidden_words=forbidden_words,
        )
        await self.save_profile(profile)
        return profile

    async def validate_draft(self, draft: str,
                            style_name: Optional[str] = None) -> VoiceMatch:
        """Validate a draft against a stored profile."""
        stored = await self.get_profile(style_name)
        if stored is None:
            return VoiceMatch(verdict="no_profile")
        profile = VoiceProfile(
            style_name=stored["style_name"],
            tone_fingerprint=stored["tone_fingerprint"] or {},
            writing_characteristics=stored["writing_characteristics"] or {},
            vocabulary_patterns=stored["vocabulary_patterns"] or {},
            formatting_rules=stored["formatting_rules"] or [],
            forbidden_words=stored["forbidden_words"] or [],
            sample_count=stored["sample_count"],
            confidence=stored["confidence"],
        )
        return validate_voice_match(draft, profile)

    async def similar_memories(self, query: str, top_k: int = 5
                               ) -> list[dict[str, Any]]:
        """Voice-aware memory lookup.

        Uses the unified `EmbeddingService` + the same pgvector store as the
        Memory Engine, so there is exactly one vector index in the platform.
        """
        from app.memory import MemoryQuery, get_memory_engine

        engine = get_memory_engine(self._db, self._user_id, self._embedding)
        results = await engine.retrieve(
            MemoryQuery(query=query, top_k=top_k, purpose="voice_similarity")
        )
        return [
            {
                "memory_id": str(r.memory_id),
                "content_asset_id": str(r.content_asset_id),
                "score": r.score,
                "text": r.text,
                "source": r.source,
                "source_type": r.source_type,
            }
            for r in results
        ]

    async def synthesize_profile_summary(self, profile: VoiceProfile) -> str:
        """Optional natural-language summary via the shared LLM Gateway.

        With no provider credential configured this routes to the deterministic
        mock provider, so the capability is exercised in Phase 2 rather than
        stubbed out.
        """
        if self._gateway is None:
            from app.llm import get_llm_gateway
            self._gateway = get_llm_gateway()

        class Summary(BaseModel):
            headline: str
            strengths: list[str]
            watch_out: list[str]

        try:
            result = await self._gateway.generate(
                user_id=self._user_id,
                request=LLMRequest(
                    purpose="voice_profile_summary",
                    feature="voice",
                    prompt_name="voice/profile_summary",
                    prompt_version="v1",
                    input_data={
                        "tone": profile.tone_fingerprint,
                        "characteristics": profile.writing_characteristics,
                        "vocabulary": profile.vocabulary_patterns.get("top_keywords", []),
                        "rules": profile.formatting_rules,
                        "sample_count": profile.sample_count,
                    },
                    response_model=Summary,
                    temperature=0.3,
                ),
                response_model=Summary,
                db=self._db,
            )
            return f"{result.headline} | strengths: {', '.join(result.strengths)}"
        except Exception as exc:
            # Summarisation is a convenience, not a core capability.
            logger.warning("Voice profile summary via gateway failed: %s", exc)
            return "deterministic profile only (no LLM summary available)"


def get_voice_engine(db: AsyncSession, user_id: uuid.UUID,
                     embedding: Optional[EmbeddingService] = None,
                     gateway: Optional[LLMGateway] = None) -> VoiceEngine:
    return VoiceEngine(db, user_id, embedding, gateway)