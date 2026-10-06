"""Producer planning and prioritisation.

**This is NEW code.** Neither donor supplies it: Module 04's planning engine was
deleted and never had ranking logic, and Module 21's `getBestTime()` returns
`new Date()` regardless of input. Building a "what should I do today" surface
without a ranking function would be building the dashboard around a list, so the
planner is the core of Phase 4 rather than a thin wrapper on an LLM.

Design commitment: **the ranking is deterministic and explainable.** The LLM may
phrase and prioritise, but the ORDER and the accept/reject decisions are computed
here from creator-owned facts. Every score carries the signals that produced it, so
a creator (or a reviewer) can see why something was recommended.

Two-stage design:

1. **Candidate generation** — deterministic rules turn context into candidate
   actions. Each candidate carries evidence. A candidate with no evidence is
   dropped, not recommended.
2. **Rank and bound** — candidates are scored, de-duplicated, filtered against the
   time budget, and cut to at most one action per Module 04 slot. If nothing
   clears the bar, the outcome is `NO_ACTION`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

from app.producer.context import CreatorContext
from app.producer.contracts import (
    ACTION_FOR_KIND,
    ActionKind,
    ClaimKind,
    Evidence,
    EvidenceKind,
    ProducerRecommendation,
    RecommendationKind,
    Priority,
    SLOT_BY_ACTION,
)

# --------------------------------------------------------------------------- #
# Signals
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Signal:
    """One weighted input to a candidate's score."""

    name: str
    weight: float
    detail: str = ""


@dataclass
class Candidate:
    """A proposed action before ranking."""

    kind: RecommendationKind
    title: str
    reason: str
    reason_kind: ClaimKind
    action_kind: ActionKind
    evidence: List[Evidence]
    platform: str = "reel"
    estimated_minutes: int = 30
    base_priority: Priority = Priority.MEDIUM
    signals: List[Signal] = field(default_factory=list)
    idea_id: Optional[Any] = None
    generation_id: Optional[Any] = None
    session_id: Optional[Any] = None
    dedupe_key: str = ""
    #: Set when the candidate points at an existing item rather than new work.
    carryover_item_id: Optional[Any] = None

    @property
    def score(self) -> float:
        return round(sum(s.weight for s in self.signals), 4)

    @property
    def slot(self) -> str:
        """Module 04's slot taxonomy, so one day's plan is a feasible shape."""
        return SLOT_BY_ACTION.get(self.action_kind, "main")

    def signal_trace(self) -> Dict[str, Any]:
        return {
            s.name: {"weight": s.weight, "detail": s.detail} for s in self.signals
        }

    def to_recommendation(self) -> ProducerRecommendation:
        from app.producer.contracts import CAPABILITY_FOR_KIND

        return ProducerRecommendation(
            kind=self.kind,
            title=self.title,
            reason=self.reason,
            reason_kind=self.reason_kind,
            priority=self.base_priority,
            action_kind=self.action_kind,
            estimated_minutes=self.estimated_minutes,
            suggested_capability=CAPABILITY_FOR_KIND.get(self.kind),
            platform=self.platform,
            next_action="studio" if CAPABILITY_FOR_KIND.get(self.kind) else "review",
            evidence=list(self.evidence),
            signals=self.signal_trace(),
        )


# --------------------------------------------------------------------------- #
# Planner
# --------------------------------------------------------------------------- #

#: Below this score a candidate is not worth a creator's time. Tuned so that
#: "there is nothing meaningful to do" is a reachable outcome.
MIN_ACCEPTABLE_SCORE = 3.0

#: A candidate that FINISHES work the creator already started outranks one that
#: proposes something new. Abandoned half-finished drafts are the failure mode a
#: Today surface exists to prevent, so the planner must not keep offering fresh
#: concepts while the creator's own work sits unreviewed.
CONTINUE_BONUS = 2.0

#: An idea the creator explicitly saved is stronger evidence of intent than a
#: speculative "create", so it clears the acceptance bar on its own.
OPEN_IDEA_SIGNAL = 3.5

#: Module 04's day shape: one main, one quick, one trust.
MAX_PER_SLOT = 1

#: Never plan more than this many items, whatever the context suggests.
MAX_ITEMS = 3


class ProducerPlanner:
    """Turns creator context into ranked, evidenced recommendations."""

    def __init__(
        self,
        *,
        min_score: float = MIN_ACCEPTABLE_SCORE,
        max_items: int = MAX_ITEMS,
        max_per_slot: int = MAX_PER_SLOT,
    ) -> None:
        self.min_score = min_score
        self.max_items = max_items
        self.max_per_slot = max_per_slot

    # ------------------------------------------------------------------ #
    # Public
    # ------------------------------------------------------------------ #

    def plan(self, context: CreatorContext) -> List[ProducerRecommendation]:
        """Produce a ranked plan for `context`.

        Returns an empty list when nothing clears the bar. An empty list is a
        legitimate, expected outcome -- surfaced to the creator as "nothing to do
        today", not as an error and not padded with filler.
        """
        candidates = self.candidates(context)
        accepted = self.rank(candidates, budget_minutes=context.time_budget_minutes)

        if not accepted:
            return []

        return [c.to_recommendation() for c in accepted]

    # ------------------------------------------------------------------ #
    # Stage 1: candidate generation
    # ------------------------------------------------------------------ #

    def candidates(self, context: CreatorContext) -> List[Candidate]:
        out: List[Candidate] = []
        out.extend(self._carryover_candidates(context))
        out.extend(self._unfinished_candidates(context))
        out.extend(self._idea_candidates(context))
        out.extend(self._create_candidate(context))
        out.extend(self._repurpose_candidate(context))
        return out

    def _carryover_candidates(self, context: CreatorContext) -> List[Candidate]:
        """Unfinished work from previous days should not be silently dropped.

        Carried-over items are re-surfaced rather than duplicated: the candidate
        points at the EXISTING plan_items row, so accepting it resumes that row
        instead of creating a second one.
        """
        out: List[Candidate] = []
        for item in context.open_carryover:
            if not item.get("title"):
                continue
            days_overdue = (context.plan_date - item["plan_date"]).days
            evidence = [
                Evidence(
                    kind=EvidenceKind.TODAY_ITEM,
                    ref_id=str(item["id"]),
                    summary=f"{item['title']} (planned for {item['plan_date']})",
                )
            ]
            signals = [
                Signal("carryover", 2.5, f"unfinished since {item['plan_date']}"),
                Signal("overdue", min(days_overdue, 5) * 0.4, f"{days_overdue} days"),
                Signal("finish_existing", CONTINUE_BONUS,
                       "planned work should not be silently dropped"),
            ]
            if item.get("status") == "blocked":
                signals.append(Signal("blocked_resurfaced", 0.5, "previously blocked"))
            out.append(
                Candidate(
                    kind=RecommendationKind.CONTINUE,
                    title=str(item["title"]),
                    reason=(
                        f"You planned this on {item['plan_date']} and it is still "
                        f"{item['status']}. Carrying it forward rather than "
                        f"losing it."
                    ),
                    reason_kind=ClaimKind.OBSERVED,
                    action_kind=ActionKind.CONTINUE_DRAFT,
                    evidence=evidence,
                    estimated_minutes=20,
                    base_priority=Priority.HIGH,
                    signals=signals,
                    carryover_item_id=item["id"],
                    dedupe_key=f"carryover:{item['id']}",
                )
            )
        return out

    def _unfinished_candidates(self, context: CreatorContext) -> List[Candidate]:
        """A Studio generation the creator never critiqued is unfinished work.

        This is the strongest signal the platform has: it is a piece of the
        creator's own content sitting incomplete.
        """
        out: List[Candidate] = []
        for work in context.unfinished:
            if work.has_critique:
                # Critiqued but not refined: the next step is iteration.
                evidence = [
                    Evidence(
                        kind=EvidenceKind.STUDIO_GENERATION,
                        ref_id=str(work.generation_id),
                        summary=f"{work.session_title} v{work.version} (critiqued)",
                    )
                ]
                signals = [
                    Signal("critiqued_not_refined", 3.5, "feedback exists, no revision yet"),
                    Signal("recency", 1.0, f"capability {work.capability}"),
                    Signal("finish_existing", CONTINUE_BONUS,
                           "revising existing work beats starting something new"),
                ]
                out.append(
                    Candidate(
                        kind=RecommendationKind.REFINE,
                        title=f"Refine: {work.session_title}",
                        reason=(
                            f"You critiqued \"{work.session_title}\" v{work.version} "
                            "but have not revised it yet. The feedback is still "
                            "actionable."
                        ),
                        reason_kind=ClaimKind.OBSERVED,
                        action_kind=ActionKind.REFINE_CONTENT,
                        evidence=evidence,
                        estimated_minutes=15,
                        base_priority=Priority.HIGH,
                        signals=signals,
                        generation_id=work.generation_id,
                        session_id=work.session_id,
                        dedupe_key=f"refine:{work.generation_id}",
                    )
                )
            else:
                evidence = [
                    Evidence(
                        kind=EvidenceKind.STUDIO_GENERATION,
                        ref_id=str(work.generation_id),
                        summary=f"{work.session_title} v{work.version}",
                    )
                ]
                signals = [
                    Signal("unreviewed_draft", 3.0, "generated but never critiqued"),
                    Signal("recency", 1.0, f"capability {work.capability}"),
                    Signal("finish_existing", CONTINUE_BONUS,
                           "reviewing existing work beats starting something new"),
                ]
                out.append(
                    Candidate(
                        kind=RecommendationKind.CONTINUE,
                        title=f"Review draft: {work.session_title}",
                        reason=(
                            f"\"{work.session_title}\" has a v{work.version} draft "
                            "in Studio that has not been reviewed."
                        ),
                        reason_kind=ClaimKind.OBSERVED,
                        action_kind=ActionKind.CONTINUE_DRAFT,
                        evidence=evidence,
                        estimated_minutes=15,
                        base_priority=Priority.HIGH,
                        signals=signals,
                        generation_id=work.generation_id,
                        session_id=work.session_id,
                        dedupe_key=f"review:{work.generation_id}",
                    )
                )
        return out

    def _idea_candidates(self, context: CreatorContext) -> List[Candidate]:
        out: List[Candidate] = []
        for idea in context.open_ideas[:3]:
            evidence = [
                Evidence(
                    kind=EvidenceKind.IDEA,
                    ref_id=str(idea["id"]),
                    summary=str(idea["title"]),
                )
            ]
            out.append(
                Candidate(
                    kind=RecommendationKind.TRIAGE_IDEA,
                    title=f"Develop idea: {idea['title']}",
                    reason=(
                        f"You saved \"{idea['title']}\" as an idea and it has not "
                        "been developed."
                    ),
                    reason_kind=ClaimKind.OBSERVED,
                    action_kind=ActionKind.REVIEW_IDEA,
                    evidence=evidence,
                    estimated_minutes=20,
                    base_priority=Priority.MEDIUM,
                    signals=[Signal("open_idea", OPEN_IDEA_SIGNAL,
                                    "the creator saved this idea themselves")],
                    idea_id=idea["id"],
                    dedupe_key=f"idea:{idea['id']}",
                )
            )
        return out

    def _create_candidate(self, context: CreatorContext) -> List[Candidate]:
        """Propose new work -- but only when the creator has enough context.

        This is the anti-fabrication gate. Without a niche and either memory or
        prior content, a "create this" recommendation would be invented, so none
        is produced.
        """
        if not context.niche:
            return []

        evidence: List[Evidence] = []
        signals: List[Signal] = [Signal("has_niche", 2.0, context.niche)]

        if context.target_audience:
            evidence.append(
                Evidence(
                    kind=EvidenceKind.CREATOR_PROFILE,
                    ref_id="creator_profile",
                    summary=f"Audience: {context.target_audience[:200]}",
                )
            )
            signals.append(Signal("has_audience", 1.0, "target audience known"))

        if context.memory_refs:
            evidence.extend(context.memory_refs[:2])
            signals.append(
                Signal("memory_grounded", 2.0, f"{len(context.memory_refs)} memory chunks")
            )
        if context.recent_assets:
            evidence.append(
                Evidence(
                    kind=EvidenceKind.CONTENT_ASSET,
                    ref_id=str(context.recent_assets[0]["id"]),
                    summary=str(context.recent_assets[0]["title"]),
                )
            )
            signals.append(Signal("has_prior_work", 1.0, "creator has content history"))

        if len(evidence) < 2:
            # Not enough creator-owned evidence to justify proposing new work.
            return []

        # NOTE: a "planning gap" signal deliberately does NOT apply here.
        # "You have not planned in 5 days" and "you left work from 5 days ago
        # unfinished" are the same fact. Scoring it as a reason to make NEW
        # content rewards abandoning the creator's own carryover work, which is
        # the opposite of what a Today surface should do. The gap is real
        # context, so it is surfaced in the run notes, but it is not evidence
        # that new content is the right next move.

        return [
            Candidate(
                kind=RecommendationKind.CREATE,
                title=f"New {context.primary_platform or 'reel'} concept: {context.niche}",
                reason=(
                    f"You work in {context.niche}"
                    + (
                        f" for {context.target_audience[:80]}"
                        if context.target_audience
                        else ""
                    )
                    + ". This proposes the next concept in that niche."
                ),
                reason_kind=ClaimKind.SUGGESTION,
                action_kind=ActionKind.CREATE_CONTENT,
                evidence=evidence,
                platform=context.primary_platform or "reel",
                estimated_minutes=45,
                base_priority=Priority.MEDIUM,
                signals=signals,
                dedupe_key=f"create:{context.niche}",
            )
        ]

    def _repurpose_candidate(self, context: CreatorContext) -> List[Candidate]:
        """Repurpose is cheap value when the creator already has an asset."""
        if not context.recent_assets:
            return []
        asset = context.recent_assets[0]
        return [
            Candidate(
                kind=RecommendationKind.REPURPOSE,
                title=f"Repurpose: {asset['title']}",
                reason=(
                    f"\"{asset['title']}\" already exists. Adapting it to another "
                    "platform is faster than making something new."
                ),
                reason_kind=ClaimKind.OBSERVED,
                action_kind=ActionKind.REPURPOSE,
                evidence=[
                    Evidence(
                        kind=EvidenceKind.CONTENT_ASSET,
                        ref_id=str(asset["id"]),
                        summary=str(asset["title"]),
                    )
                ],
                estimated_minutes=15,
                base_priority=Priority.LOW,
                signals=[
                    Signal("existing_asset", 2.0, "the creator already made this"),
                    Signal("low_effort", 1.5,
                           "repurposing is the cheapest meaningful action available"),
                ],
                dedupe_key=f"repurpose:{asset['id']}",
            )
        ]

    # ------------------------------------------------------------------ #
    # Stage 2: rank and bound
    # ------------------------------------------------------------------ #

    def rank(
        self, candidates: Sequence[Candidate], *, budget_minutes: int = 120
    ) -> List[Candidate]:
        """Score, de-duplicate, bound to the budget, and cut to one per slot.

        Deterministic: the same context always produces the same plan, so a creator
        refreshing Today does not get a reshuffled day.
        """
        scored = [c for c in candidates if c.evidence]
        if not scored:
            return []

        # Stable sort: equal scores keep generation order, so the result is
        # reproducible rather than dependent on dict ordering.
        ordered = sorted(scored, key=lambda c: -c.score)

        accepted: List[Candidate] = []
        slot_counts: Dict[str, int] = {}
        seen_keys: set = set()
        minutes = 0

        for candidate in ordered:
            if candidate.score < self.min_score:
                continue
            if candidate.dedupe_key and candidate.dedupe_key in seen_keys:
                continue
            slot = candidate.slot
            if slot_counts.get(slot, 0) >= self.max_per_slot:
                continue
            if minutes + candidate.estimated_minutes > budget_minutes:
                continue

            accepted.append(candidate)
            seen_keys.add(candidate.dedupe_key)
            slot_counts[slot] = slot_counts.get(slot, 0) + 1
            minutes += candidate.estimated_minutes

            if len(accepted) >= self.max_items:
                break

        return accepted


__all__ = [
    "Candidate",
    "Signal",
    "ProducerPlanner",
    "MIN_ACCEPTABLE_SCORE",
    "MAX_ITEMS",
    "MAX_PER_SLOT",
]
