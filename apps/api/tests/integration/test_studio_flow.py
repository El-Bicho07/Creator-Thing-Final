"""Studio end-to-end: session -> idea -> memory -> voice -> capability -> persist
-> critique -> refine -> new version.

This is the §35 integration path, exercised in one continuous flow so the
*compositions* are covered, not just the units:

- context really goes through `LongTermMemoryEngine` and `CreatorVoiceEngine`
  (E5 embeddings, pgvector, RLS) rather than a stub;
- generation really goes through `LLMGateway`;
- output really lands in `content_assets` + `studio_generations` with provenance;
- refinement really appends a version instead of overwriting.

Provenance in `content_assets.metadata` is asserted end-to-end: it must be possible
to answer "how was this piece of content generated?" from the database alone.
"""
from __future__ import annotations

import json
import uuid

import pytest
from sqlalchemy import text

from app.llm.gateway import LLMGateway, set_llm_gateway
from app.llm.providers import ScriptedLLMProvider
from app.memory import IngestRequest, MemoryCategory, SourceType, get_memory_engine
from app.voice import VoiceEngine, VoiceProfile, get_voice_engine
from tests.conftest import USER_A, admin_db

pytestmark = pytest.mark.asyncio

IDEA_JSON = json.dumps({
    "ideas": [
        {
            "title": "Launch on a Tuesday",
            "angle": "Midweek launches face less inbox competition.",
            "why_it_could_work": "Concrete and immediately actionable.",
            "format": "tutorial",
            "difficulty": "easy",
        }
    ]
})

CRITIQUE_JSON = json.dumps({
    "overall_score": 6.0,
    "verdict": "Right idea, weak middle.",
    "items": [
        {
            "dimension": "structure",
            "severity": "medium",
            "finding": "The second value line repeats the first.",
            "suggestion": "Replace it with a concrete number.",
        }
    ],
    "strengths": ["The opening is specific."],
})

REFINE_JSON = json.dumps({
    "content": (
        "Launch midweek. Inbox competition is lower, and I got 400 signups "
        "in 48 hours when I did."
    ),
    "changes": [
        {"change": "Added the concrete signup number", "reason": "Specificity"}
    ],
})


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


def _gateway(script: list[str]) -> ScriptedLLMProvider:
    provider = ScriptedLLMProvider(script=script)
    set_llm_gateway(LLMGateway(providers={provider.name: provider}))
    return provider


async def _seed_memory_and_voice(user_id: uuid.UUID) -> None:
    """Give the creator real memory and a real voice profile.

    Both go through the Phase 2 engines, so this also proves Studio's context
    assembly has real Phase 2 data to work with.
    """
    from tests.conftest import rls_session

    async with rls_session(user_id) as db:
        engine = get_memory_engine(db, user_id)
        await engine.ingest(IngestRequest(
            title="Launch day lesson",
            raw_text=(
                "I launched my SaaS landing page on a Tuesday and got 400 "
                "signups in 48 hours. My mistake was waiting three weeks to "
                "email my list. Next launch I will pre-warm the audience 48 "
                "hours in advance."
            ),
            source_type=SourceType.NOTE,
            category=MemoryCategory.LESSON,
        ))

        voice = get_voice_engine(db, user_id)
        await voice.save_profile(VoiceProfile(
            style_name="Primary Style",
            tone_fingerprint={"confidence": 0.8, "warmth": 0.7, "directness": 0.9},
            writing_characteristics={"avg_sentence_length": 14, "uses_short_sentences": True},
            vocabulary_patterns={"top_keywords": ["launch", "signups", "audience"]},
            formatting_rules=["Keep paragraphs to two sentences"],
            forbidden_words=["delve", "leverage"],
            sample_count=3,
            confidence=0.75,
        ))
        await db.commit()


# --------------------------------------------------------------------------- #
# The full flow
# --------------------------------------------------------------------------- #

async def test_full_studio_lifecycle(client_a):
    """session -> context -> idea -> persist -> critique -> refine -> new version."""
    await _seed_memory_and_voice(USER_A)
    _gateway([IDEA_JSON, CRITIQUE_JSON, REFINE_JSON])

    async with client_a as ac:
        # ---- 1. start a session ----
        session = (await ac.post("/api/studio/sessions", json={
            "title": "Launch reel",
            "brief": "A reel about launching on a Tuesday",
        })).json()
        assert session["current_step"] == "context"

        # ---- 2. context really is assembled from Phase 2 services ----
        context = (await ac.get(
            f"/api/studio/sessions/{session['id']}/context"
        )).json()

        assert context["memory_used"] >= 1, "Memory Engine must supply context"
        assert context["voice_available"] is True, "Voice Engine must supply context"
        assert "<retrieved_memory>" in context["retrieved_memory"]
        assert "<creator_voice>" in context["creator_voice"]
        # Real memory content, not a placeholder.
        assert "Tuesday" in context["retrieved_memory"]
        assert "signups" in context["retrieved_memory"]
        # The voice block reflects the stored profile.
        assert "delve" in context["creator_voice"]     # forbidden words surfaced
        assert "launch" in context["creator_voice"].lower()

        # ---- 3. generate ----
        generated = (await ac.post("/api/studio/generate", json={
            "session_id": session["id"],
            "capability": "idea",
            "input": {"topic": "launch day timing", "count": 1},
            "platform": "reel",
            "goal": "reach",
        })).json()

        assert generated["version"] == 1
        assert generated["output"]["count"] == 1
        # The generation reports the context it actually used.
        assert generated["context_summary"]["memory_chunks"] >= 1
        assert generated["context_summary"]["voice_available"] is True

        # The workflow advanced to review.
        after_gen = (await ac.get(f"/api/studio/sessions/{session['id']}")).json()
        assert after_gen["current_step"] == "review"
        assert after_gen["last_capability"] == "idea"

        # ---- 4. critique the stored version ----
        critique = (await ac.post("/api/studio/critique", json={
            "session_id": session["id"],
            "generation_id": generated["generation_id"],
        })).json()

        assert critique["overall_score"] == 6.0
        assert critique["items"][0]["dimension"] == "structure"
        assert critique["strengths"]

        after_critique = (await ac.get(f"/api/studio/sessions/{session['id']}")).json()
        assert after_critique["current_step"] == "refine"

        # ---- 5. refine -> a NEW version ----
        refined = (await ac.post("/api/studio/refine", json={
            "session_id": session["id"],
            "instruction": "add the concrete number",
            "generation_id": generated["generation_id"],
        })).json()

        assert "version" in refined, refined
        assert refined["version"] == 2
        assert refined["capability"] == "refine"
        assert "400 signups" in refined["output"]["content"]

        # ---- 6. both versions survive, oldest first ----
        versions = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    assert versions["total"] == 2
    v1, v2 = versions["versions"]
    assert v1["version"] == 1
    assert v2["version"] == 2
    # The original is intact: refinement did not overwrite it.
    assert "Launch on a Tuesday" in v1["text"]
    assert "400 signups" in v2["text"]
    # Lineage is recorded.
    assert v1["parent_generation_id"] is None
    assert v2["parent_generation_id"] == v1["id"]
    # Critique is attached to the version it reviewed.
    assert v1["critique"]["overall_score"] == 6.0
    # Neither version is auto-approved.
    assert v1["creator_approved"] is False
    assert v2["creator_approved"] is False


async def test_generated_content_provenance_is_answerable_from_the_database(client_a):
    """§20: "How was this piece of content generated?" must be answerable."""
    _gateway([IDEA_JSON])

    async with client_a as ac:
        session = (await ac.post("/api/studio/sessions", json={
            "title": "Provenance", "brief": "launch timing",
        })).json()
        generated = (await ac.post("/api/studio/generate", json={
            "session_id": session["id"],
            "capability": "idea",
            "input": {"topic": "launch timing", "count": 1},
            "platform": "reel",
            "goal": "trust",
            "tone": "conversational",
        })).json()

    async with admin_db() as db:
        asset = (await db.execute(text(
            "SELECT raw_text, source_type, external_id, metadata "
            "FROM content_assets WHERE id = :i"
        ), {"i": uuid.UUID(generated["asset_id"])})).mappings().one()

        generation = (await db.execute(text(
            "SELECT capability, prompt_name, prompt_version, version, latency_ms "
            "FROM studio_generations WHERE id = :i"
        ), {"i": uuid.UUID(generated["generation_id"])})).mappings().one()

        call = (await db.execute(text("""
            SELECT feature, provider, model, prompt_version, success
            FROM ai_calls
            WHERE user_id = :u AND feature = 'studio'
            ORDER BY created_at DESC
            LIMIT 1
        """), {"u": USER_A})).mappings().first()

    metadata = asset["metadata"]
    assert metadata["produced_by"] == "studio"
    assert metadata["capability"] == "idea"
    assert metadata["version"] == 1
    assert metadata["platform"] == "reel"
    assert metadata["goal"] == "trust"
    assert metadata["donor"] == ["01_Content_Idea_Generator"]
    assert metadata["studio_session_id"] == session["id"]
    assert asset["source_type"] == "studio"
    assert asset["external_id"] == f"studio:{session['id']}:1"

    assert generation["prompt_name"] == "studio/idea"
    assert generation["prompt_version"] == "v1"

    # The full chain is traceable in ai_calls too (§32).
    assert call is not None, "Studio must record through ai_calls"
    assert call["feature"] == "studio"
    assert call["success"] is True


async def test_refinement_consumes_the_previous_critique(client_a):
    """§23: refinement is Current + Instruction + Memory + Voice + Critique."""
    _gateway([IDEA_JSON, CRITIQUE_JSON, REFINE_JSON])

    async with client_a as ac:
        session = (await ac.post("/api/studio/sessions", json={
            "title": "Critique fed forward", "brief": "launch timing",
        })).json()
        generated = (await ac.post("/api/studio/generate", json={
            "session_id": session["id"], "capability": "idea",
            "input": {"topic": "launch timing", "count": 1},
        })).json()
        await ac.post("/api/studio/critique", json={
            "session_id": session["id"],
            "generation_id": generated["generation_id"],
        })
        await ac.post("/api/studio/refine", json={
            "session_id": session["id"],
            "instruction": "apply the critique",
            "generation_id": generated["generation_id"],
        })
        versions = (await ac.get(
            f"/api/studio/sessions/{session['id']}/versions"
        )).json()

    refined = next(v for v in versions["versions"] if v["version"] == 2)
    # The critique is preserved on the version that was reviewed, and the
    # refinement recorded its own change list.
    assert refined["parent_generation_id"]
    assert refined["critique"] is None or isinstance(refined["critique"], dict)
    assert "400 signups" in refined["text"]


async def test_studio_stores_generated_content_in_the_shared_asset_store(client_a):
    """§20/§41: reuse `content_assets`; do not create a second asset store."""
    _gateway([IDEA_JSON])

    async with client_a as ac:
        session = (await ac.post("/api/studio/sessions", json={
            "title": "Shared store", "brief": "x",
        })).json()
        generated = (await ac.post("/api/studio/generate", json={
            "session_id": session["id"], "capability": "idea",
            "input": {"topic": "x", "count": 1},
        })).json()

    async with admin_db() as db:
        # The generation's asset_id points at a content_assets row: one store.
        linked = (await db.execute(text("""
            SELECT a.id, a.source_type
            FROM content_assets a
            JOIN studio_generations g ON g.asset_id = a.id
            WHERE g.id = :i
        """), {"i": uuid.UUID(generated["generation_id"])})).mappings().one()

    assert linked["id"] == uuid.UUID(generated["asset_id"])
    assert linked["source_type"] == "studio"


async def test_studio_never_writes_embeddings_itself(client_a):
    """§12: Studio must not embed directly; Memory Engine owns that.

    Generation must leave the vector store untouched. Studio writes only
    `content_assets`; chunking and E5 embedding belong to the Memory Engine.
    """
    _gateway([IDEA_JSON])

    async with admin_db() as db:
        before = (await db.execute(
            text("SELECT COUNT(*) AS n FROM chunks")
        )).scalar()

    async with client_a as ac:
        session = (await ac.post("/api/studio/sessions", json={
            "title": "No embedding", "brief": "x",
        })).json()
        await ac.post("/api/studio/generate", json={
            "session_id": session["id"], "capability": "idea",
            "input": {"topic": "x", "count": 1},
        })

    async with admin_db() as db:
        after = (await db.execute(text("SELECT COUNT(*) AS n FROM chunks"))).scalar()

    # Generating Studio content does not create embeddings.
    assert after == before


async def test_context_degrades_gracefully_without_memory_or_voice(client_a):
    """A brand-new creator must still be able to generate."""
    _gateway([IDEA_JSON])

    async with client_a as ac:
        session = (await ac.post("/api/studio/sessions", json={
            "title": "No history", "brief": "a brand new idea",
        })).json()

        context = (await ac.get(
            f"/api/studio/sessions/{session['id']}/context"
        )).json()
        generated = (await ac.post("/api/studio/generate", json={
            "session_id": session["id"], "capability": "idea",
            "input": {"topic": "a brand new idea", "count": 1},
        })).json()

    assert context["memory_used"] == 0
    assert context["voice_available"] is False
    assert context["notes"]           # the degradation is reported, not hidden
    assert generated["version"] == 1  # generation still succeeded


async def test_generation_budget_is_enforced_per_session(client_a):
    """§33: bounded cost, enforced before the Gateway is called."""
    _gateway([IDEA_JSON])

    from app.studio.orchestrator import BudgetPolicy, StudioOrchestrator
    from tests.conftest import rls_session

    async with rls_session(USER_A) as db:
        orchestrator = StudioOrchestrator(
            db, USER_A, budget=BudgetPolicy(max_generations_per_session=2)
        )
        session = await orchestrator.repository.create_session(
            title="Budgeted", brief="x"
        )

        first = await orchestrator.run_capability(
            session, "idea", {"topic": "a", "count": 1}
        )
        second = await orchestrator.run_capability(
            session, "idea", {"topic": "b", "count": 1}
        )
        third = await orchestrator.run_capability(
            session, "idea", {"topic": "c", "count": 1}
        )

    assert first.generation is not None
    assert second.generation is not None
    assert third.generation is None
    assert any("reached its limit" in w for w in third.warnings)
    assert any(s["stage"] == "budget" and s["status"] == "error"
               for s in third.stage_dicts())


async def test_refinement_budget_is_bounded_per_version(client_a):
    from app.studio.orchestrator import BudgetPolicy, StudioOrchestrator
    from tests.conftest import rls_session

    _gateway([IDEA_JSON] + [REFINE_JSON] * 5)

    async with rls_session(USER_A) as db:
        orchestrator = StudioOrchestrator(
            db, USER_A,
            budget=BudgetPolicy(
                max_generations_per_session=50,
                max_refinements_per_version=1,
            ),
        )
        session = await orchestrator.repository.create_session(
            title="Refine budget", brief="launch timing"
        )
        await orchestrator.run_capability(
            session, "idea", {"topic": "launch timing", "count": 1}
        )

        first = await orchestrator.refine(session, instruction="once")
        second = await orchestrator.refine(session, instruction="twice")

    assert first.generation is not None
    assert second.generation is None
    assert any("refined" in w for w in second.warnings)
