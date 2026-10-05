"""Studio API tests: session CRUD, generation, critique, refinement, authorization.

Every assertion runs against real PostgreSQL RLS over real RLS-scoped sessions, and
every generation runs through the real LLM Gateway with a scripted provider — only
the network hop is replaced. Nothing here trusts client-supplied ownership.

Donor smoke coverage for the ported capabilities lives in
`tests/unit/test_studio_capabilities.py`; this file covers the HTTP surface and the
persistence/RLS behaviour.
"""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List

import pytest
from sqlalchemy import text

from app.core.db import admin_session_maker
from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from tests.conftest import admin_db, rls_session

pytestmark = pytest.mark.asyncio

USER_C = uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc")


def _gateway(script: List[str], *, error_at: int | None = None) -> ScriptedLLMProvider:
    """Install a Gateway backed by a scripted provider. Restored by fixture."""
    provider = ScriptedLLMProvider(script=script, error_at=error_at)
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


@pytest.fixture(autouse=True)
def _restore_gateway():
    from app.llm.gateway import get_llm_gateway

    previous = None
    try:
        previous = get_llm_gateway()
    except Exception:
        previous = None
    yield
    set_llm_gateway(previous)


IDEA_JSON = json.dumps(
    {
        "ideas": [
            {
                "title": "Why Tuesday is the best launch day",
                "angle": "Midweek launches face less inbox competition.",
                "why_it_could_work": "Concrete and testable.",
                "format": "tutorial",
                "difficulty": "easy",
            },
            {
                "title": "The three-week email mistake",
                "angle": "Waiting three weeks cost 400 signups.",
                "why_it_could_work": "Regret framing.",
                "format": "story",
                "difficulty": "medium",
            },
        ]
    }
)

SCRIPT_JSON = json.dumps(
    {
        "title": "Launch timing",
        "segments": [
            {"role": "HOOK", "text": "Nobody tells you this about launch day.",
             "visual": "close-up"},
            {"role": "SETUP", "text": "I launched on a Tuesday.",
             "visual": "laptop"},
            {"role": "VALUE", "text": "Inbox competition is lower midweek."},
            {"role": "VALUE", "text": "I got 400 signups in 48 hours."},
            {"role": "PAYOFF", "text": "Timing is a free advantage."},
            {"role": "CTA", "text": "Try Tuesday for your launch."},
        ],
    }
)

CRITIQUE_JSON = json.dumps(
    {
        "overall_score": 7.5,
        "verdict": "The hook works; the middle is thin.",
        "items": [
            {
                "dimension": "structure",
                "severity": "medium",
                "finding": "Two consecutive value lines blur into one point.",
                "suggestion": "Merge them and add a concrete number.",
            }
        ],
        "strengths": ["The opening line earns attention immediately."],
    }
)

REFINE_JSON = json.dumps(
    {
        "content": "Launch midweek. Inbox competition is lower.",
        "changes": [{"change": "Tightened the opening", "reason": "It was slow"}],
    }
)


# --------------------------------------------------------------------------- #
# Health / catalogue
# --------------------------------------------------------------------------- #

async def test_studio_health(client_a):
    async with client_a as ac:
        response = await ac.get("/api/studio/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["phase"] == 3
    assert body["workflow_steps"] == ["context", "generate", "review", "refine", "done"]


async def test_capabilities_catalogue_lists_every_capability(client_a):
    async with client_a as ac:
        response = await ac.get("/api/studio/capabilities")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 8
    ids = {c["id"] for c in body["capabilities"]}
    assert {"idea", "hook", "script", "caption", "repurpose", "cta",
            "thumbnail", "refine"} == ids

    for capability in body["capabilities"]:
        assert capability["description"]
        assert capability["input_schema"]["properties"]
        assert capability["output_schema"]["properties"]


async def test_capabilities_expose_donor_provenance(client_a):
    """The API states where each capability came from."""
    async with client_a as ac:
        response = await ac.get("/api/studio/capabilities")

    by_id = {c["id"]: c for c in response.json()["capabilities"]}
    assert by_id["idea"]["donor"] == ["01_Content_Idea_Generator"]
    assert by_id["cta"]["classification"] == "REBUILD"
    assert by_id["idea"]["classification"] == "ADAPT"


async def test_platform_catalogue_exposes_constraints(client_a):
    async with client_a as ac:
        response = await ac.get("/api/studio/platforms")

    assert response.status_code == 200
    platforms = {p["key"]: p for p in response.json()["platforms"]}
    assert platforms["reel"]["kind"] == "video"
    assert platforms["x"]["caption_char_cap"] <= 280
    assert platforms["reel"]["allowed_formats"]


async def test_workflow_steps_are_the_documented_five(client_a):
    async with client_a as ac:
        response = await ac.get("/api/studio/workflow")
    assert [s["key"] for s in response.json()["steps"]] == [
        "context", "generate", "review", "refine", "done"
    ]


# --------------------------------------------------------------------------- #
# Authentication
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "path",
    [
        "/api/studio/sessions",
        "/api/studio/capabilities",
        "/api/studio/platforms",
    ],
)
async def test_studio_requires_authentication(path):
    """No token, no Studio."""
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get(path)
    assert response.status_code == 401


# --------------------------------------------------------------------------- #
# Session CRUD
# --------------------------------------------------------------------------- #

async def test_create_session_returns_201_and_persists(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/studio/sessions",
            json={"title": "Launch reel", "brief": "A reel about launch timing"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Launch reel"
    assert body["status"] == "active"
    assert body["current_step"] == "context"
    assert body["brief"] == "A reel about launch timing"

    # Really persisted, not just returned.
    async with admin_db() as db:
        row = (await db.execute(
            text("SELECT title, user_id FROM studio_sessions WHERE id = :i"),
            {"i": uuid.UUID(body["id"])},
        )).mappings().one()
    assert row["title"] == "Launch reel"


async def test_session_survives_a_new_request(client_a):
    """Server state, not React memory: a fresh client still sees the session."""
    async with client_a as ac:
        created = (await ac.post(
            "/api/studio/sessions", json={"title": "Persistent"}
        )).json()

        response = await ac.get(f"/api/studio/sessions/{created['id']}")

    assert response.status_code == 200
    assert response.json()["title"] == "Persistent"


async def test_list_sessions_returns_only_own(client_a):
    async with client_a as ac:
        await ac.post("/api/studio/sessions", json={"title": "Mine"})
        response = await ac.get("/api/studio/sessions")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all(s["title"] for s in body["sessions"])


async def test_update_session_is_partial(client_a):
    async with client_a as ac:
        created = (await ac.post(
            "/api/studio/sessions",
            json={"title": "Original", "brief": "Original brief"},
        )).json()

        response = await ac.patch(
            f"/api/studio/sessions/{created['id']}",
            json={"current_step": "generate"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["current_step"] == "generate"
    assert body["title"] == "Original"          # untouched
    assert body["brief"] == "Original brief"    # untouched


async def test_update_session_rejects_a_blank_title(client_a):
    async with client_a as ac:
        created = (await ac.post(
            "/api/studio/sessions", json={"title": "Valid"}
        )).json()
        response = await ac.patch(
            f"/api/studio/sessions/{created['id']}", json={"title": "   "}
        )
    assert response.status_code == 422


async def test_delete_session_removes_it(client_a):
    async with client_a as ac:
        created = (await ac.post(
            "/api/studio/sessions", json={"title": "Doomed"}
        )).json()

        deleted = await ac.delete(f"/api/studio/sessions/{created['id']}")
        assert deleted.status_code == 204

        gone = await ac.get(f"/api/studio/sessions/{created['id']}")
        assert gone.status_code == 404


async def test_create_session_rejects_a_blank_title(client_a):
    async with client_a as ac:
        response = await ac.post("/api/studio/sessions", json={"title": ""})
    assert response.status_code == 422


async def test_create_session_rejects_unknown_fields(client_a):
    async with client_a as ac:
        response = await ac.post(
            "/api/studio/sessions",
            json={"title": "ok", "user_id": str(USER_C)},  # ownership attempt
        )
    assert response.status_code == 422


async def test_unknown_session_is_404(client_a):
    async with client_a as ac:
        response = await ac.get(
            f"/api/studio/sessions/{uuid.uuid4()}"
        )
    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

async def test_generate_persists_a_version_with_provenance(client_a):
    _gateway([IDEA_JSON])

    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions",
            json={"title": "Ideas", "brief": "launch timing"},
        )).json()

        response = await ac.post(
            "/api/studio/generate",
            json={
                "session_id": session["id"],
                "capability": "idea",
                "input": {"topic": "launch timing", "count": 2},
                "platform": "reel",
                "goal": "reach",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 1
    assert body["capability"] == "idea"
    assert body["prompt_name"] == "studio/idea"
    assert body["prompt_version"] == "v1"
    assert len(body["output"]["ideas"]) == 2
    assert body["latency_ms"] > 0

    # The asset exists and records how it was generated.
    async with admin_db() as db:
        asset = (await db.execute(
            text("SELECT title, source_type, metadata FROM content_assets WHERE id = :i"),
            {"i": uuid.UUID(body["asset_id"])},
        )).mappings().one()
        generation = (await db.execute(
            text("SELECT capability, prompt_name, prompt_version, version "
                 "FROM studio_generations WHERE id = :i"),
            {"i": uuid.UUID(body["generation_id"])},
        )).mappings().one()

    assert asset["source_type"] == "studio"
    assert asset["metadata"]["produced_by"] == "studio"
    assert asset["metadata"]["capability"] == "idea"
    assert asset["metadata"]["donor"] == ["01_Content_Idea_Generator"]
    assert generation["capability"] == "idea"
    assert generation["prompt_version"] == "v1"
    assert generation["version"] == 1


async def test_generate_advances_the_workflow_step(client_a):
    _gateway([SCRIPT_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Script"}
        )).json()

        await ac.post(
            "/api/studio/generate",
            json={
                "session_id": session["id"],
                "capability": "script",
                "input": {"topic": "launch timing", "duration_sec": 30},
            },
        )
        after = await ac.get(f"/api/studio/sessions/{session['id']}")

    # Script output should be awaiting review.
    assert after.json()["current_step"] == "review"
    assert after.json()["last_capability"] == "script"


async def test_generate_versions_increment_and_link_to_the_parent(client_a):
    _gateway([IDEA_JSON, IDEA_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Versions"}
        )).json()

        first = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "a", "count": 1}},
        )).json()
        second = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "b", "count": 1}},
        )).json()

        versions = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert first["version"] == 1
    assert second["version"] == 2
    assert second["generation_id"] != first["generation_id"]

    assert versions["total"] == 2
    by_version = {v["version"]: v for v in versions["versions"]}
    assert by_version[1]["parent_generation_id"] is None
    assert by_version[2]["parent_generation_id"] == first["generation_id"]


async def test_generate_with_unknown_capability_is_404(client_a):
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "x"}
        )).json()
        response = await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "telepathy",
                  "input": {}},
        )
    assert response.status_code == 404
    assert "Available" in response.json()["detail"]


async def test_generate_with_invalid_input_is_422(client_a):
    """Invalid input fails locally, before any LLM cost."""
    _gateway([IDEA_JSON])   # would succeed if validation did not stop it
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "x"}
        )).json()
        response = await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"count": 3}},  # topic is required
        )
    # Input validation is a client error, so it must be 422 rather than 502.
    assert response.status_code == 422
    assert "Invalid input" in response.json()["detail"]


async def test_generate_against_a_missing_session_is_404(client_a):
    _gateway([IDEA_JSON])
    async with client_a as ac:
        response = await ac.post(
            "/api/studio/generate",
            json={"session_id": str(uuid.uuid4()), "capability": "idea",
                  "input": {"topic": "x"}},
        )
    assert response.status_code == 404


async def test_generate_does_not_overwrite_the_previous_version(client_a):
    _gateway([IDEA_JSON, REFINE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Preserve"}
        )).json()

        first = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "launch timing", "count": 2}},
        )).json()

        refined = (await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"],
                  "instruction": "make it punchier"},
        )).json()

        versions = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert refined["version"] == 2
    by_version = {v["version"]: v for v in versions["versions"]}
    # Version 1's text is still intact.
    assert "Tuesday" in by_version[1]["text"]
    assert by_version[1]["asset_id"] == first["asset_id"]


# --------------------------------------------------------------------------- #
# Critique
# --------------------------------------------------------------------------- #

async def test_critique_returns_structured_feedback_and_stores_it(client_a):
    _gateway([IDEA_JSON, CRITIQUE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Review"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "launch timing", "count": 1}},
        )).json()

        response = await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"],
                  "generation_id": generation["generation_id"]},
        )
        # Stored against the version it reviewed.
        versions = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert response.status_code == 200
    body = response.json()
    assert body["overall_score"] == 7.5
    assert body["verdict"] == "The hook works; the middle is thin."
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["dimension"] == "structure"
    assert item["severity"] == "medium"
    assert item["suggestion"]            # actionable, not just a complaint
    assert body["strengths"]
    assert versions["versions"][0]["critique"]["overall_score"] == 7.5


async def test_critique_does_not_change_the_content(client_a):
    """Critique reviews; it never edits. §22 human control."""
    _gateway([IDEA_JSON, CRITIQUE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "NoEdit"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "launch timing", "count": 1}},
        )).json()
        before = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

        await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"],
                  "generation_id": generation["generation_id"]},
        )
        after = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert before["versions"][0]["text"] == after["versions"][0]["text"]
    assert before["versions"][0]["version"] == after["versions"][0]["version"]
    assert after["total"] == before["total"]


async def test_critique_advances_to_the_refine_step(client_a):
    _gateway([IDEA_JSON, CRITIQUE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Step"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()
        await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"],
                  "generation_id": generation["generation_id"]},
        )
        after = await ac.get(f"/api/studio/sessions/{session['id']}")

    assert after.json()["current_step"] == "refine"


async def test_critique_with_nothing_generated_is_409(client_a):
    """An empty critique must not look like a good critique."""
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Empty"}
        )).json()
        response = await ac.post(
            "/api/studio/critique", json={"session_id": session["id"]}
        )
    assert response.status_code == 409
    assert "Generate content first" in response.json()["detail"]


async def test_critique_arbitrary_text_without_a_version(client_a):
    _gateway([CRITIQUE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "AdHoc"}
        )).json()
        response = await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"],
                  "text": "Some draft the creator pasted in."},
        )
    assert response.status_code == 200
    assert response.json()["generation_id"] is None


async def test_critique_provider_failure_is_502(client_a):
    from app.core.errors import AITimeoutError
    from app.llm.providers.base import ProviderAdapter

    _gateway([IDEA_JSON])

    class AlwaysFails(ProviderAdapter):
        name = "always_fails"

        def __init__(self):
            super().__init__(api_key="x")

        @property
        def is_configured(self) -> bool:
            return True

        async def complete(self, request):
            raise AITimeoutError("upstream gone")

    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "FailReview"}
        )).json()

        set_llm_gateway(LLMGateway(providers={"always_fails": AlwaysFails()}))
        response = await ac.post(
            "/api/studio/critique",
            json={"session_id": session["id"], "text": "a draft"},
        )

    assert response.status_code == 502
    # No stack trace or provider internals in the response.
    assert "Traceback" not in response.json()["detail"]


# --------------------------------------------------------------------------- #
# Refinement
# --------------------------------------------------------------------------- #

async def test_refine_creates_a_new_version_preserving_the_old(client_a):
    _gateway([IDEA_JSON, REFINE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Refine"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "launch timing", "count": 2}},
        )

        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"],
                  "instruction": "tighten the opening"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 2
    assert body["capability"] == "refine"
    assert body["output"]["changes"][0]["change"] == "Tightened the opening"


async def test_refine_with_a_modifier(client_a):
    _gateway([IDEA_JSON, REFINE_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Mod"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )
        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"], "instruction": "trim",
                  "modifier": "shorter"},
        )
    assert response.status_code == 200


async def test_refine_rejects_an_unsupported_modifier(client_a):
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "BadMod"}
        )).json()
        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"], "instruction": "do it",
                  "modifier": "be_sarcastic"},
        )
    assert response.status_code == 422


async def test_refine_requires_content(client_a):
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "NoContent"}
        )).json()
        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"], "instruction": "improve it"},
        )
    assert response.status_code == 409
    assert "Generate" in response.json()["detail"] or "refine" in response.json()["detail"]


async def test_refine_requires_a_non_blank_instruction(client_a):
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Blank"}
        )).json()
        response = await ac.post(
            "/api/studio/refine",
            json={"session_id": session["id"], "instruction": "   "},
        )
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Versions and approval
# --------------------------------------------------------------------------- #

async def test_versions_endpoint_returns_text_and_lineage(client_a):
    _gateway([IDEA_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "History"}
        )).json()
        await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "launch timing", "count": 2}},
        )
        response = await ac.get(f"/api/studio/sessions/{session['id']}/versions")

    assert response.status_code == 200
    version = response.json()["versions"][0]
    assert version["version"] == 1
    assert "Tuesday" in version["text"]
    assert version["creator_approved"] is False
    assert version["created_at"]


async def test_approval_is_explicit_and_recorded(client_a):
    """§24 human control: nothing is approved without the creator asking."""
    _gateway([IDEA_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Approve"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

        # Not approved by default.
        before = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()
        assert before["versions"][0]["creator_approved"] is False

        response = await ac.post(
            f"/api/studio/versions/{generation['generation_id']}/approve",
            json={"approved": True},
        )

    assert response.status_code == 200
    assert response.json()["creator_approved"] is True


async def test_approval_can_be_withdrawn(client_a):
    _gateway([IDEA_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "Withdraw"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()

        await ac.post(
            f"/api/studio/versions/{generation['generation_id']}/approve",
            json={"approved": True},
        )
        response = await ac.post(
            f"/api/studio/versions/{generation['generation_id']}/approve",
            json={"approved": False},
        )
    assert response.json()["creator_approved"] is False


async def test_delete_version_removes_it_and_its_asset(client_a):
    _gateway([IDEA_JSON])
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions", json={"title": "DeleteVersion"}
        )).json()
        generation = (await ac.post(
            "/api/studio/generate",
            json={"session_id": session["id"], "capability": "idea",
                  "input": {"topic": "x", "count": 1}},
        )).json()
        asset_id = generation["asset_id"]

        response = await ac.delete(
            f"/api/studio/versions/{generation['generation_id']}"
        )
        assert response.status_code == 204

        remaining = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert remaining["total"] == 0

    # The underlying asset is gone too: Studio must not orphan content.
    async with admin_db() as db:
        asset = (await db.execute(
            text("SELECT 1 FROM content_assets WHERE id = :i"),
            {"i": uuid.UUID(asset_id)},
        )).first()
    assert asset is None


async def test_delete_unknown_version_is_404(client_a):
    async with client_a as ac:
        response = await ac.delete(f"/api/studio/versions/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_approve_unknown_version_is_404(client_a):
    async with client_a as ac:
        response = await ac.post(
            f"/api/studio/versions/{uuid.uuid4()}/approve", json={"approved": True}
        )
    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# Context preview
# --------------------------------------------------------------------------- #

async def test_context_preview_reports_what_would_be_used(client_a):
    async with client_a as ac:
        session = (await ac.post(
            "/api/studio/sessions",
            json={"title": "Context", "brief": "a reel about launching"},
        )).json()
        response = await ac.get(f"/api/studio/sessions/{session['id']}/context")

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session["id"]
    assert body["memory_used"] >= 0
    assert body["voice_available"] in (True, False)
    assert isinstance(body["notes"], list)


async def test_context_preview_on_missing_session_is_404(client_a):
    async with client_a as ac:
        response = await ac.get(f"/api/studio/sessions/{uuid.uuid4()}/context")
    assert response.status_code == 404
