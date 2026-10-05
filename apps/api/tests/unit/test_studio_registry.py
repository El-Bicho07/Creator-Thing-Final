"""Capability registry contract.

Adapted from Module 18 (Guruvelah) `tests/integration/orchestrator.test.ts:6`,
which supplied a fake provider routing on prompt substrings so the whole pipeline
could be exercised with zero API calls. Studio's equivalent is a scripted Gateway,
so capability tests never touch a network.

The point of these tests is the *contract*: every registered capability must
declare schemas and a donor, must validate its input, and must never let the
registry dispatch to something unregistered.
"""
from __future__ import annotations

import json

import pytest
from pydantic import BaseModel

from app.studio.capabilities.implementations import (
    ALL_CAPABILITIES,
    HOOK_STYLES,
    MODIFIER_INSTRUCTIONS,
    build_registry,
)
from app.studio.registry import CapabilityError, StudioCapabilityRegistry

EXPECTED_IDS = {
    "idea", "hook", "script", "caption",
    "repurpose", "cta", "thumbnail", "refine",
}


@pytest.fixture
def registry():
    return build_registry()


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #

def test_registry_contains_every_expected_capability(registry):
    assert set(registry.ids()) == EXPECTED_IDS


def test_no_capability_is_registered_twice(registry):
    ids = [c.id for c in ALL_CAPABILITIES]
    assert len(ids) == len(set(ids))


def test_registry_is_immutable_by_accident(registry):
    """Re-registering an existing id must fail rather than silently replace it."""
    with pytest.raises(ValueError):
        registry.register(ALL_CAPABILITIES[0])


def test_unknown_capability_raises_with_a_helpful_message(registry):
    with pytest.raises(CapabilityError) as excinfo:
        registry.require("telepathy")
    message = str(excinfo.value)
    assert "telepathy" in message
    # The error should list what IS available, so the client can self-correct.
    assert "script" in message
    assert excinfo.value.status == "unknown_capability"


def test_require_returns_the_capability(registry):
    capability = registry.require("script")
    assert capability.id == "script"
    assert capability.execute is not None


def test_get_returns_none_for_unknown(registry):
    assert registry.get("nope") is None


def test_membership_and_len(registry):
    assert "idea" in registry
    assert "nope" not in registry
    assert len(registry) == len(EXPECTED_IDS)


def test_infos_are_sorted_and_complete(registry):
    infos = registry.infos()
    assert [i["id"] for i in infos] == sorted(EXPECTED_IDS)
    for info in infos:
        assert info["name"]
        assert info["description"]
        assert info["classification"] in ("PORT", "ADAPT", "REBUILD", "NEW", "PARK")


def test_every_capability_declares_input_and_output_schemas(registry):
    for info in registry.infos():
        assert info["input_schema"], f"{info['id']} has no input schema"
        assert info["input_schema"].get("properties") is not None
        assert info["output_schema"], f"{info['id']} has no output schema"
        assert "properties" in info["output_schema"]


def test_every_capability_records_its_donor(registry):
    """Provenance matters: a capability with no donor and no NEW class is a bug."""
    for capability in registry.list():
        if capability.classification == "NEW":
            continue
        assert capability.donor, (
            f"{capability.id} is {capability.classification} but names no donor"
        )


def test_infos_are_json_serialisable(registry):
    """The API returns these directly; a non-serialisable field breaks the client."""
    for info in registry.infos():
        json.dumps(info)


# --------------------------------------------------------------------------- #
# Input validation — before any LLM cost
# --------------------------------------------------------------------------- #

def test_validate_input_accepts_valid_payload(registry):
    capability = registry.require("idea")
    parsed = capability.validate_input({"topic": "launching a SaaS"})
    assert parsed.topic == "launching a SaaS"
    assert parsed.count == 5


def test_validate_input_rejects_missing_required_field(registry):
    capability = registry.require("idea")
    with pytest.raises(CapabilityError) as excinfo:
        capability.validate_input({})
    assert excinfo.value.status == "invalid_input"


def test_validate_input_enforces_length_bounds(registry):
    capability = registry.require("idea")
    with pytest.raises(CapabilityError):
        capability.validate_input({"topic": "x" * 400})


def test_validate_input_enforces_numeric_bounds(registry):
    capability = registry.require("idea")
    with pytest.raises(CapabilityError):
        capability.validate_input({"topic": "ok", "count": 999})


def test_validate_input_rejects_unknown_fields(registry):
    """Extra fields are a client bug; silently ignoring them hides it."""
    capability = registry.require("idea")
    parsed = capability.validate_input(
        {"topic": "ok", "totally_unexpected": "value"}
    )
    assert not hasattr(parsed, "totally_unexpected")


def test_validate_input_of_none_fails_rather_than_proceeding(registry):
    """`payload or {}` in validate_input means None becomes an empty payload."""
    capability = registry.require("cta")
    with pytest.raises(CapabilityError):
        capability.validate_input(None)


def test_validate_input_of_empty_dict_fails_for_required_fields(registry):
    capability = registry.require("cta")
    with pytest.raises(CapabilityError):
        capability.validate_input({})


def test_hook_input_optional_styles(registry):
    capability = registry.require("hook")
    parsed = capability.validate_input({"topic": "launching"})
    assert parsed.styles is None
    assert parsed.limit == 5


# --------------------------------------------------------------------------- #
# Donor-derived taxonomies
# --------------------------------------------------------------------------- #

def test_hook_styles_are_the_donor_taxonomy(registry):
    """Module 03's ten mandatory styles; the UI renders one slot per style."""
    capability = registry.require("hook")
    assert capability.donor == ("03_Hook_Generator",)
    assert len(HOOK_STYLES) == 10
    assert len(set(HOOK_STYLES)) == 10


def test_refinement_modifiers_are_the_donor_set():
    """Module 18's MODIFIER_INSTRUCTIONS, plus SIMPLER."""
    assert set(MODIFIER_INSTRUCTIONS) == {
        "shorter", "more_casual", "more_bold", "more_educational", "simpler",
    }
    for text in MODIFIER_INSTRUCTIONS.values():
        assert text.strip()


def test_capability_classifications_are_honest(registry):
    """Spot-check that each capability's classification matches the audit."""
    expected = {
        "idea": "ADAPT",        # Module 01
        "hook": "ADAPT",        # Module 03
        "script": "ADAPT",      # Module 05 + 18
        "caption": "ADAPT",     # Module 08
        "repurpose": "ADAPT",   # Module 02
        "cta": "REBUILD",       # Module 09 (implementation absent from donor)
        "thumbnail": "ADAPT",   # Module 07
        "refine": "ADAPT",      # Module 18 modifiers
    }
    for capability_id, classification in expected.items():
        assert registry.require(capability_id).classification == classification


def test_empty_registry_works():
    empty = StudioCapabilityRegistry()
    assert len(empty) == 0
    assert empty.list() == []
    with pytest.raises(CapabilityError):
        empty.require("anything")


# --------------------------------------------------------------------------- #
# Friendly error mapping
# --------------------------------------------------------------------------- #

def test_friendly_maps_timeout():
    from app.studio.registry import _friendly

    assert "timed out" in _friendly(TimeoutError("request timed out"))


def test_friendly_maps_rate_limit():
    from app.studio.registry import _friendly

    assert "Rate limited" in _friendly(RuntimeError("429 rate limit exceeded"))


def test_friendly_maps_credential_problem_without_leaking():
    from app.studio.registry import _friendly

    message = _friendly(RuntimeError("invalid api key sk-ant-SECRETVALUE"))
    assert "not configured" in message
    assert "SECRETVALUE" not in message


def test_friendly_falls_back_without_leaking_internals():
    from app.studio.registry import _friendly

    message = _friendly(RuntimeError("Traceback: internal path /app/secret.py"))
    assert "Traceback" not in message
    assert "/app/secret.py" not in message
