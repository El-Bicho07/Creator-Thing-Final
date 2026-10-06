"""Producer contracts: states, transitions, evidence and capability mapping.

These encode the rules the rest of Phase 4 relies on:

- the Today state machine and its legal transitions (so an illegal move is a 409,
  not a silently-accepted write or a database constraint error);
- the Module 04 slot taxonomy;
- the evidence contract, which is the Module 21 citation-forcing pattern made
  resolvable rather than merely non-empty.
"""
from __future__ import annotations

import pytest

from app.producer.contracts import (
    ACTION_FOR_KIND,
    CAPABILITY_FOR_KIND,
    ALLOWED_TRANSITIONS,
    ActionKind,
    ClaimKind,
    Evidence,
    EvidenceKind,
    Priority,
    ProducerRecommendation,
    RecommendationKind,
    SLOT_BY_ACTION,
    TodayItem,
    TodayItemStatus,
    TodayPlan,
)


# --------------------------------------------------------------------------- #
# State machine
# --------------------------------------------------------------------------- #

def test_all_states_have_a_transition_table_entry():
    for state in TodayItemStatus:
        assert state in ALLOWED_TRANSITIONS, state


def test_terminal_states_have_no_outgoing_transitions():
    """Completed work must never be silently reopened."""
    assert ALLOWED_TRANSITIONS[TodayItemStatus.COMPLETED] == set()


def test_planned_can_reach_every_active_state():
    assert ALLOWED_TRANSITIONS[TodayItemStatus.PLANNED] == {
        TodayItemStatus.IN_PROGRESS,
        TodayItemStatus.COMPLETED,
        TodayItemStatus.SKIPPED,
        TodayItemStatus.BLOCKED,
    }


def test_blocked_and_skipped_can_be_reopened():
    """A creator who changes their mind must not be locked out."""
    assert TodayItemStatus.PLANNED in ALLOWED_TRANSITIONS[TodayItemStatus.BLOCKED]
    assert TodayItemStatus.PLANNED in ALLOWED_TRANSITIONS[TodayItemStatus.SKIPPED]


def test_transitions_are_symmetric_in_sense_of_reachability():
    """Every non-terminal state must be able to reach a terminal state.

    Otherwise an item could get permanently stuck and the creator could never
    clear it.
    """
    terminal = {TodayItemStatus.COMPLETED, TodayItemStatus.SKIPPED}
    for state in ALLOWED_TRANSITIONS:
        if state is TodayItemStatus.COMPLETED:
            continue
        seen: set = {state}
        frontier = [state]
        while frontier:
            current = frontier.pop()
            for nxt in ALLOWED_TRANSITIONS.get(current, set()):
                if nxt not in seen:
                    seen.add(nxt)
                    frontier.append(nxt)
        assert seen & terminal, f"{state} cannot reach a terminal state"


# --------------------------------------------------------------------------- #
# Slot taxonomy (Module 04)
# --------------------------------------------------------------------------- #

def test_every_action_has_a_slot():
    """Module 04's 3-slot day decomposition, preserved."""
    for action in ActionKind:
        assert action in SLOT_BY_ACTION, action


def test_slot_vocabulary_is_the_donors():
    assert set(SLOT_BY_ACTION.values()) == {"main", "quick", "trust"}


def test_substantial_work_maps_to_main():
    """The three slots are only useful if real work lands in 'main'."""
    assert SLOT_BY_ACTION[ActionKind.CREATE_CONTENT] == "main"
    assert SLOT_BY_ACTION[ActionKind.CONTINUE_DRAFT] == "main"
    assert SLOT_BY_ACTION[ActionKind.BUILD_TRUST] == "trust"


# --------------------------------------------------------------------------- #
# Capability + action mapping
# --------------------------------------------------------------------------- #

def test_capability_mapping_covers_every_kind():
    for kind in RecommendationKind:
        assert kind in CAPABILITY_FOR_KIND, kind
        assert kind in ACTION_FOR_KIND, kind


def test_no_action_maps_to_no_capability():
    assert CAPABILITY_FOR_KIND[RecommendationKind.NO_ACTION] is None


def test_capabilities_named_by_the_producer_are_real_studio_capabilities():
    """The Producer must never invent a capability the Studio registry lacks."""
    from app.studio import build_registry

    known = set(build_registry().ids())
    for kind, capability in CAPABILITY_FOR_KIND.items():
        if capability is None:
            continue
        assert capability in known, f"{kind} names unknown capability {capability}"


def test_capability_mapping_avoids_refinement_for_creation():
    """`refine` needs existing content; a create recommendation must not pick it."""
    assert CAPABILITY_FOR_KIND[RecommendationKind.CREATE] != "refine"
    assert CAPABILITY_FOR_KIND[RecommendationKind.REFINE] == "refine"


# --------------------------------------------------------------------------- #
# Evidence
# --------------------------------------------------------------------------- #

def test_evidence_requires_a_ref_id():
    with pytest.raises(Exception):
        Evidence(kind=EvidenceKind.MEMORY, ref_id="   ")


def test_evidence_rejects_unknown_fields():
    with pytest.raises(Exception):
        Evidence(kind=EvidenceKind.MEMORY, ref_id="x", fabricated="y")


def test_every_evidence_kind_is_platform_backed():
    """An evidence kind with no owning table could never be resolved."""
    from app.producer.service import _EVIDENCE_TABLES

    for kind in EvidenceKind:
        assert kind in _EVIDENCE_TABLES, kind


# --------------------------------------------------------------------------- #
# Recommendation contract
# --------------------------------------------------------------------------- #

def _rec(**kwargs) -> ProducerRecommendation:
    base = dict(
        kind=RecommendationKind.CREATE,
        title="Something worth doing",
        reason="Because of a real creator fact",
        evidence=[Evidence(kind=EvidenceKind.IDEA, ref_id="i")],
    )
    base.update(kwargs)
    return ProducerRecommendation(**base)


def test_recommendation_derives_capability_and_next_action():
    r = _rec()
    assert r.suggested_capability == "idea"
    assert r.next_action == "studio"


def test_recommendation_rejects_a_blank_title():
    with pytest.raises(Exception):
        _rec(title="   ")


def test_recommendation_rejects_a_blank_reason():
    with pytest.raises(Exception):
        _rec(reason="  ")


def test_recommendation_defaults_to_a_suggestion_not_a_fact():
    """The anti-fabrication default: unlabelled reasoning is a judgement."""
    assert _rec().reason_kind is ClaimKind.SUGGESTION


def test_no_action_is_not_actionable():
    r = _rec(kind=RecommendationKind.NO_ACTION)
    assert r.is_actionable is False
    assert r.suggested_capability is None


def test_recommendation_rejects_unknown_fields():
    """A client must not be able to smuggle in extra fields."""
    with pytest.raises(Exception):
        _rec(status="approved")


def test_recommendation_bounds_reason_length():
    with pytest.raises(Exception):
        _rec(reason="x" * 5_000)


# --------------------------------------------------------------------------- #
# Plan + priority
# --------------------------------------------------------------------------- #

def test_priority_values_order_correctly():
    from app.producer.contracts import PRIORITY_VALUE

    assert PRIORITY_VALUE[Priority.HIGH] < PRIORITY_VALUE[Priority.MEDIUM]
    assert PRIORITY_VALUE[Priority.MEDIUM] < PRIORITY_VALUE[Priority.LOW]


def test_priority_vocabulary_is_module_04s():
    assert {p.value for p in Priority} == {"high", "medium", "low"}


def test_plan_priority_item_picks_the_first_open_item():
    import uuid
    from datetime import date

    def item(status):
        return TodayItem(
            id=uuid.uuid4(), plan_date=date.today(), title="t", status=status, rank=0
        )

    plan = TodayPlan(
        plan_date=date.today(),
        items=[
            item(TodayItemStatus.COMPLETED),
            item(TodayItemStatus.PLANNED),
        ],
    )
    assert plan.priority_item is not None
    assert plan.priority_item.status is TodayItemStatus.PLANNED


def test_plan_with_no_open_items_has_no_priority():
    import uuid
    from datetime import date

    plan = TodayPlan(
        plan_date=date.today(),
        items=[
            TodayItem(
                id=uuid.uuid4(), plan_date=date.today(), title="t",
                status=TodayItemStatus.COMPLETED,
            )
        ],
    )
    assert plan.priority_item is None


def test_action_kinds_cover_the_task_spec():
    """Every action kind named in the task's Today item list exists."""
    required = {
        "create_content", "continue_draft", "refine_content", "repurpose",
        "review_idea", "publish_prep", "quick_engage", "build_trust",
    }
    assert required <= {a.value for a in ActionKind}


def test_statuses_cover_the_task_spec():
    required = {"planned", "in_progress", "completed", "skipped", "blocked"}
    assert required <= {s.value for s in TodayItemStatus}
