"""Content opportunities. Adapted from Module 11, upstream half only.

Module 11's `pipeline/ideas.py` (359 lines) generated finished content: reel hooks,
on-screen text, caption drafts, hashtags, carousel blueprints. **That is Studio's
job.** Phase 3 owns generation, critique and refinement; Phase 5 owns
understanding. Reproducing it would create a second generation engine.

What is kept from the donor is the upstream contract:

    comment -> intent -> topic -> structured opportunity -> Today -> Studio

An opportunity says *what to make and why the audience is asking*, never what the
content should say.

Grouping is deterministic. Module 11 clustered comments with `sklearn.KMeans` over
its own `SentenceTransformer` -- a second embedding system, which Phase 5 cannot
have. Here comments are grouped by explicit content key first, and the platform's
Phase 2 Embedding Service (via the Memory Engine) is the only path to semantic
similarity, exactly as in Phase 3 and Phase 4.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Sequence

from app.growth.comments import demand_score, intent_weight, normalize_demand
from app.growth.contracts import (
    CommentCategory,
    CommentClassification,
    CommentIntent,
    ContentOpportunity,
    OpportunityOrigin,
)

#: Intents that represent demand for *new* content rather than feedback on
#: existing content. Praise about a post does not ask for a different post.
DEMAND_INTENTS = frozenset({
    CommentIntent.REQUEST,
    CommentIntent.PAIN_POINT,
    CommentIntent.QUESTION,
    CommentIntent.CONFUSION,
    CommentIntent.MORE_OF_THIS,
})

#: A format is only suggested when the audience's own words support it.
_FORMAT_HINTS: Sequence[tuple[re.Pattern[str], str]] = (
    (re.compile(r"\b(step by step|walk me through|guide|tutorial|how do i|"
                r"how to|beginner|setup|install)\b", re.I), "tutorial"),
    (re.compile(r"\b(list|top \d+|ways|tools|apps|compare|vs\.?|versus)\b", re.I), "list"),
    (re.compile(r"\b(story|behind the scenes|bts|how i|my process)\b", re.I), "story"),
    (re.compile(r"\b(explain|why|what is|meaning of|difference)\b", re.I), "explainer"),
    (re.compile(r"\b(mistake|mistakes|avoid|don'?t do|regret)\b", re.I), "mistakes"),
)

_STOPWORDS = frozenset("""
a an the and or but if then this that these those is are was were be been being
i you he she it we they me my your our their to of in on for with about from
at by as so do does did have has had can could would should will just how what
why when where which who whom not no yes very really please thanks thank you
im ive dont thats its im getting got like also more most much many some any
""".split())

_WORD = re.compile(r"[a-z0-9']+")


def topic_key(text: str, *, limit: int = 4) -> str:
    """Deterministic grouping key for a comment.

    Content-bearing words only, so "how do I start python" and "how do I start
    javascript" group together while "love this video 🔥" does not join them.
    """
    words = _WORD.findall(text.lower())
    keep = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    return " ".join(sorted(set(keep))[:limit])


def suggested_format(texts: Sequence[str], default: str = "reel") -> str:
    """Pick a target format from the audience's own words, else the default."""
    blob = " ".join(texts)
    for pattern, value in _FORMAT_HINTS:
        if pattern.search(blob):
            return value
    return default


def suggest_angle(classifications: Sequence[CommentClassification]) -> str:
    """One sentence describing what the audience actually asked for.

    Built from the most common question verbatim where possible. Deterministic --
    a creator can check this claim against the comments they can see.
    """
    questions: List[str] = []
    for classification in classifications:
        questions.extend(classification.extracted_questions)
    if questions:
        return f"Answer directly: “{questions[0]}”"

    intents = [c.intent for c in classifications]
    if intents.count(CommentIntent.PAIN_POINT) >= max(1, len(intents) // 2):
        return "Walk through the obstacle your audience keeps hitting."
    if intents.count(CommentIntent.MORE_OF_THIS) >= max(1, len(intents) // 2):
        return "Continue what your audience explicitly asked you to repeat."
    return "Address the recurring question in your comments."


class OpportunityDetector:
    """Groups audience comments into ranked, evidence-backed opportunities."""

    def __init__(self, user_id) -> None:
        self.user_id = user_id

    # ------------------------------------------------------------------ #

    def detect(
        self, classifications: Sequence[CommentClassification]
    ) -> List[ContentOpportunity]:
        """Group and rank opportunities.

        Only demand-bearing, non-spam comments participate. Praise is evidence
        about the current post, not a request for a new one.
        """
        usable = [
            c for c in classifications
            if c.category is not CommentCategory.SPAM
            and c.intent in DEMAND_INTENTS
        ]
        if not usable:
            return []

        groups: Dict[str, List[CommentClassification]] = defaultdict(list)
        for classification in usable:
            groups[topic_key(classification.text)].append(classification)

        drafted: List[tuple[ContentOpportunity, float]] = []
        for key, members in groups.items():
            if not key:
                continue
            # Unique commenters, not raw comment count: one loud account repeating
            # itself is not a trend.
            unique_commenters = len(
                {m.comment_id.rsplit("-", 1)[0] for m in members}
            ) or len(members)
            weighted = sum(intent_weight(m.intent) for m in members)
            raw = demand_score(
                unique_commenters=unique_commenters, weighted_intent_sum=weighted
            )

            texts = [m.text for m in members]
            opportunity = ContentOpportunity(
                title=f"Answer: {key.replace(' ', ' ').title()}"[:255],
                angle=suggest_angle(members),
                target_format=suggested_format(texts),
                demand_score=raw,
                origin=OpportunityOrigin.COMMENT,
                evidence={
                    "topic_key": key,
                    "unique_commenters": unique_commenters,
                    "comment_count": len(members),
                    "intents": sorted({m.intent.value for m in members}),
                    "categories": sorted({m.category.value for m in members}),
                    "computation": (
                        "raw = unique_commenters ** 0.85 * "
                        "(sum of intent weights + 1)"
                    ),
                    "sample_comments": [m.comment_id for m in members[:5]],
                },
                source_comment_ids=[m.comment_id for m in members],
            )
            drafted.append((opportunity, raw))

        if not drafted:
            return []

        normalized = normalize_demand([raw for _, raw in drafted])
        for (opportunity, raw), score in zip(drafted, normalized):
            opportunity.demand_score = score
            opportunity.evidence["raw_demand"] = raw
            opportunity.evidence["normalization"] = (
                "45 + (raw - min) / (max - min) * 54, across this cohort only"
            )

        drafted.sort(key=lambda pair: pair[0].demand_score, reverse=True)
        return [opportunity for opportunity, _ in drafted]

    # ------------------------------------------------------------------ #

    @staticmethod
    def from_insight(insight) -> ContentOpportunity:
        """Turn a performance insight into an opportunity.

        The Performance-driven path of the same contract, so a creator reaches
        "make more of this" from a number as readily as from a comment.
        """
        evidence = insight.evidence or {}
        title = f"Follow up: {insight.title}"[:255]
        metric = evidence.get("metric", "engagement_rate")
        return ContentOpportunity(
            title=title,
            angle=(
                insight.recommended_action
                or f"Repeat the approach behind your strongest {metric} result."
            ),
            target_format=str(evidence.get("platform") or "reel"),
            demand_score=0.0,
            origin=OpportunityOrigin.PERFORMANCE,
            evidence={
                "insight_type": insight.insight_type.value,
                "rule_key": insight.rule_key,
                "source_records": insight.source_records,
                "insight_evidence": evidence,
                "confidence": insight.confidence.score,
            },
            insight_id=insight.id,
        )


__all__ = [
    "OpportunityDetector",
    "topic_key",
    "suggested_format",
    "suggest_angle",
    "DEMAND_INTENTS",
]
