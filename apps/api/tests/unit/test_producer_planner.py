"""Producer planner: candidate generation, scoring, ranking and duplicate prevention.

**This is the capability neither donor had.** Module 04's planner engine was
deleted and had no ranking logic; Module 21's `getBestTime()` returns `new Date()`
regardless of input. So the ranking is new code, and these tests are its real
specification.

What is asserted here:

- a candidate with no evidence is never recommended (the Module 21
  citation-forcing pattern);
- a sparse creator produces NO recommendation rather than an invented one;
- ordering is deterministic and evidence-driven, not arbitrary;
- at most one item per Module 04 slot, bounded by the time budget;
- carryover work is resumed through the existing item rather than duplicated.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest

from app.producer.context import CreatorContext, UnfinishedWork
from app.producer.contracts import (
    ActionKind,
    ClaimKind,
    Evidence,
    EvidenceKind,
    Priority,
    RecommendationKind,
)
from app.producer.planner import (
    MAX_ITEMS,
    MIN_ACCEPTABLE_SCORE,
    Candidate,
    ProducerPlanner,
    Signal,
)

TODAY = date(2026, 3, 10)


def _ev(ref: str = "i1", kind: EvidenceKind = EvidenceKind.IDEA) -> Evidence:
    return Evidence(kind=kind, ref_id=ref, summary="creator-owned record")


def _candidate(**kwargs) -> Candidate:
    base = dict(
        kind=RecommendationKind.CREATE,
        title="Candidate",
        reason="Because of evidence",
        reason_kind=ClaimKind.OBSERVED,
        action_kind=ActionKind.CREATE_CONTENT,
        evidence=[_ev()],
        signals=[Signal("base", 4.0)],
        dedupe_key="k1",
    )
    base.update(kwargs)
    return Candidate(**base)


# --------------------------------------------------------------------------- #
# Ranking invariants
# --------------------------------------------------------------------------- #

def test_candidate_without_evidence_is_never_accepted():
    """The citation-forcing rule, enforced at ranking time."""
    planner = ProducerPlanner()
    accepted = planner.rank([_candidate(evidence=[])], budget_minutes=120)
    assert accepted == []


def test_below_threshold_candidate_is_rejected():
    planner = ProducerPlanner()
    weak = _candidate(signals=[Signal("weak", 0.5)])
    assert planner.rank([weak], budget_minutes=120) == []


def test_threshold_is_respected_at_the_boundary():
    planner = ProducerPlanner(min_score=3.0)
    at_threshold = _candidate(signals=[Signal("s", 3.0)])
    assert len(planner.rank([at_threshold], budget_minutes=120)) == 1
    just_under = _candidate(signals=[Signal("s", 2.999)])
    assert planner.rank([just_under], budget_minutes=120) == []


def test_score_is_the_sum_of_signal_weights():
    candidate = _candidate(
        signals=[Signal("a", 1.5, "detail"), Signal("b", 2.0)]
    )
    assert candidate.score == 3.5


def test_signal_trace_is_explainable():
    """Every score must be decomposable, so a recommendation can be justified."""
    candidate = _candidate(signals=[Signal("overdue", 2.5, "3 days")])
    trace = candidate.signal_trace()
    assert trace["overdue"]["weight"] == 2.5
    assert trace["overdue"]["detail"] == "3 days"


def test_ranking_is_deterministic():
    """Refreshing Today must not reshuffle the day."""
    planner = ProducerPlanner(max_items=3, max_per_slot=3)
    candidates = [
        _candidate(title="A", dedupe_key="a", signals=[Signal("s", 3.0)],
                   action_kind=ActionKind.CREATE_CONTENT),
        _candidate(title="B", dedupe_key="b", signals=[Signal("s", 3.0)],
                   action_kind=ActionKind.REFINE_CONTENT),
        _candidate(title="C", dedupe_key="c", signals=[Signal("s", 3.0)],
                   action_kind=ActionKind.QUICK_ENGAGE),
    ]
    first = [c.title for c in planner.rank(candidates, budget_minutes=600)]
    for _ in range(5):
        assert [c.title for c in planner.rank(candidates, budget_minutes=600)] == first


def test_higher_score_ranks_first():
    planner = ProducerPlanner(max_per_slot=3)
    low = _candidate(title="low", dedupe_key="low", signals=[Signal("s", 3.0)])
    high = _candidate(title="high", dedupe_key="high", signals=[Signal("s", 9.0)])
    ordered = planner.rank([low, high], budget_minutes=600)
    assert [c.title for c in ordered] == ["high", "low"]


def test_at_most_one_item_per_slot():
    """Module 04's day shape: one main, one quick, one trust."""
    planner = ProducerPlanner(max_items=10, max_per_slot=1, min_score=1.0)
    candidates = [
        _candidate(title=f"main{i}", dedupe_key=f"m{i}", signals=[Signal("s", 9.0 - i)],
                   action_kind=ActionKind.CREATE_CONTENT)
        for i in range(3)
    ]
    accepted = planner.rank(candidates, budget_minutes=600)
    assert len(accepted) == 1


def test_time_budget_is_respected():
    planner = ProducerPlanner(max_items=10, max_per_slot=10, min_score=1.0)
    candidates = [
        _candidate(title=f"i{i}", dedupe_key=f"i{i}", estimated_minutes=45,
                   signals=[Signal("s", 9.0 - i)],
                   action_kind=[ActionKind.CREATE_CONTENT,
                                ActionKind.QUICK_ENGAGE,
                                ActionKind.BUILD_TRUST][i])
        for i in range(3)
    ]
    accepted = planner.rank(candidates, budget_minutes=60)
    assert sum(c.estimated_minutes for c in accepted) <= 60


def test_item_count_is_bounded():
    """The configured cap wins, whatever it is."""
    for cap in (1, 2, 3):
        planner = ProducerPlanner(max_items=cap, max_per_slot=10, min_score=1.0)
        candidates = [
            _candidate(title=f"i{i}", dedupe_key=f"i{i}", signals=[Signal("s", 20.0 - i)],
                       action_kind=[ActionKind.CREATE_CONTENT,
                                    ActionKind.QUICK_ENGAGE,
                                    ActionKind.BUILD_TRUST][i % 3])
            for i in range(6)
        ]
        accepted = planner.rank(candidates, budget_minutes=600)
        assert len(accepted) == cap, f"cap {cap} produced {len(accepted)}"


def test_default_item_cap_is_three():
    """Module 04's day shape: at most three actions in a day."""
    assert MAX_ITEMS == 3


def test_duplicate_dedupe_keys_are_dropped():
    planner = ProducerPlanner(max_per_slot=10, min_score=1.0)
    a = _candidate(title="first", dedupe_key="same")
    b = _candidate(title="second", dedupe_key="same")
    accepted = planner.rank([a, b], budget_minutes=600)
    assert len(accepted) == 1
    assert accepted[0].title == "first"


def test_empty_candidate_list_ranks_to_empty():
    assert ProducerPlanner().rank([], budget_minutes=120) == []


# --------------------------------------------------------------------------- #
# Candidate generation from context
# --------------------------------------------------------------------------- #

def _rich_context(**overrides) -> CreatorContext:
    base = dict(
        plan_date=TODAY,
        niche="launch timing for solo creators",
        target_audience="solo creators who ship weekly",
        primary_platform="reel",
        content_goals=["education"],
        voice_summary="Voice style: Primary Style",
        has_voice=True,
        memory_text="- [lesson] launch on Tuesday",
        memory_refs=[_ev("m1", EvidenceKind.MEMORY)],
        recent_assets=[{"id": "a1", "title": "Prior reel"}],
        open_ideas=[{"id": "i1", "title": "Saved idea"}],
        time_budget_minutes=120,
    )
    base.update(overrides)
    return CreatorContext(**base)


def test_rich_creator_gets_a_create_recommendation():
    recommendations = ProducerPlanner().plan(_rich_context())
    kinds = [r.kind for r in recommendations]
    assert RecommendationKind.CREATE in kinds
    create = next(r for r in recommendations if r.kind is RecommendationKind.CREATE)
    # Every recommendation carries evidence.
    assert create.evidence
    assert create.suggested_capability == "idea"


def test_sparse_creator_gets_nothing():
    """A creator with no profile, no memory and no work must not be given
    fabricated recommendations."""
    context = CreatorContext(plan_date=TODAY, time_budget_minutes=120)
    assert ProducerPlanner().plan(context) == []


def test_profile_alone_is_not_enough_to_propose_new_work():
    """A niche plus an audience is still thin; inventing a topic from it would be
    a guess presented as advice."""
    context = CreatorContext(
        plan_date=TODAY,
        niche="launch timing",
        target_audience="solo creators",
        time_budget_minutes=120,
    )
    assert ProducerPlanner().plan(context) == []


def test_memory_is_what_makes_a_create_recommendation_evidenced():
    """Shows the anti-fabrication gate is doing real work."""
    without = CreatorContext(
        plan_date=TODAY, niche="launch timing", target_audience="solo creators",
        primary_platform="reel", time_budget_minutes=120,
    )
    with_memory = CreatorContext(
        plan_date=TODAY, niche="launch timing", target_audience="solo creators",
        primary_platform="reel", memory_refs=[_ev("m1", EvidenceKind.MEMORY)],
        time_budget_minutes=120,
    )
    assert ProducerPlanner().plan(without) == []
    assert ProducerPlanner().plan(with_memory) != []


def test_carryover_is_resumed_not_duplicated():
    context = _rich_context(
        open_carryover=[{
            "id": "11111111-1111-4111-8111-111111111111",
            "plan_date": TODAY - timedelta(days=2),
            "title": "Old draft",
            "status": "planned",
            "action_kind": None,
            "reason": None,
        }]
    )
    candidates = ProducerPlanner().candidates(context)
    carry = [c for c in candidates if c.kind is RecommendationKind.CONTINUE]
    assert carry, "carryover work must be surfaced"
    # It points at the EXISTING item, so accepting resumes rather than duplicates.
    assert carry[0].carryover_item_id is not None
    assert carry[0].dedupe_key.startswith("carryover:")


def test_more_overdue_carryover_scores_higher():
    planner = ProducerPlanner()
    old = CreatorContext(
        plan_date=TODAY,
        open_carryover=[{
            "id": "11111111-1111-4111-8111-111111111111",
            "plan_date": TODAY - timedelta(days=9),
            "title": "Very old", "status": "planned", "action_kind": None,
            "reason": None,
        }],
        time_budget_minutes=120,
    )
    recent = CreatorContext(
        plan_date=TODAY,
        open_carryover=[{
            "id": "22222222-2222-4222-8222-222222222222",
            "plan_date": TODAY - timedelta(days=1),
            "title": "Recent", "status": "planned", "action_kind": None,
            "reason": None,
        }],
        time_budget_minutes=120,
    )
    old_scores = [c.score for c in planner.candidates(old) if c.kind is RecommendationKind.CONTINUE]
    new_scores = [c.score for c in planner.candidates(recent) if c.kind is RecommendationKind.CONTINUE]
    assert old_scores and new_scores
    assert old_scores[0] > new_scores[0]


def test_unreviewed_draft_surfaces_as_continue():
    context = _rich_context(unfinished=[UnfinishedWork(
        generation_id=uuid.uuid4(), session_id=uuid.uuid4(),
        session_title="Draft session", capability="idea", version=1,
        has_critique=False, text_preview="text", created_at=None,
    )])
    candidates = ProducerPlanner().candidates(context)
    continue_ = [c for c in candidates if c.kind is RecommendationKind.CONTINUE]
    assert continue_ and "Review draft" in continue_[0].title


def test_critiqued_draft_surfaces_as_refine():
    """Critique already happened, so the next step is iteration, not review."""
    context = _rich_context(unfinished=[UnfinishedWork(
        generation_id=uuid.uuid4(), session_id=uuid.uuid4(),
        session_title="Critiqued session", capability="script", version=2,
        has_critique=True, text_preview="text", created_at=None,
    )])
    candidates = ProducerPlanner().candidates(context)
    refine = [c for c in candidates if c.kind is RecommendationKind.REFINE]
    assert refine and "Refine" in refine[0].title


def test_saved_idea_is_offered_for_triage():
    candidates = ProducerPlanner().candidates(_rich_context())
    triage = [c for c in candidates if c.kind is RecommendationKind.TRIAGE_IDEA]
    assert triage and triage[0].idea_id == "i1"


def test_existing_asset_enables_repurpose():
    candidates = ProducerPlanner().candidates(_rich_context())
    repurpose = [c for c in candidates if c.kind is RecommendationKind.REPURPOSE]
    assert repurpose
    assert repurpose[0].estimated_minutes < 30, "repurposing should be the cheap option"


def test_no_assets_means_no_repurpose_candidate():
    context = _rich_context(recent_assets=[])
    candidates = ProducerPlanner().candidates(context)
    assert not [c for c in candidates if c.kind is RecommendationKind.REPURPOSE]


def test_every_generated_candidate_has_evidence():
    """The structural guarantee, checked across a rich context."""
    context = _rich_context(unfinished=[UnfinishedWork(
        generation_id=uuid.uuid4(), session_id=uuid.uuid4(),
        session_title="S", capability="idea", version=1,
        has_critique=True, text_preview="t", created_at=None,
    )])
    for candidate in ProducerPlanner().candidates(context):
        assert candidate.evidence, f"{candidate.title} was generated without evidence"


def test_recommendations_are_ordered_by_score():
    recommendations = ProducerPlanner().plan(_rich_context())
    if len(recommendations) >= 2:
        scores = [sum(v["weight"] for v in r.signals.values()) for r in recommendations]
        assert scores == sorted(scores, reverse=True)


def test_no_action_is_reachable_end_to_end():
    """`NO_ACTION` must be a real outcome of planning, not just an enum value."""
    recommendations = ProducerPlanner().plan(CreatorContext(plan_date=TODAY))
    assert recommendations == []


def test_planning_is_pure_with_respect_to_input():
    """Planning must not mutate the context it was given."""
    context = _rich_context()
    before = (context.niche, len(context.memory_refs), len(context.recent_assets))
    ProducerPlanner().plan(context)
    assert (context.niche, len(context.memory_refs), len(context.recent_assets)) == before


def test_default_score_threshold_is_positive():
    assert MIN_ACCEPTABLE_SCORE > 0, (
        "a zero threshold would let any candidate through, which defeats the "
        "point of ranking"
    )
