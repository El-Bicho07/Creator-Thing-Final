"""HTTP API tests for the Phase 2 platform services.

Authentication is overridden because Supabase is not reachable in development,
but the database session is a REAL RLS-scoped session created by the production
helper (`app.core.db.rls_scoped_session`), so ownership and row-level isolation
are genuinely exercised over HTTP.

Note on fixture shape: `client_a` / `client_b` are **sync** fixtures returning an
async context manager, so each test enters them with `async with ... as ac`.
pytest-asyncio 0.24 runs async fixtures and async tests on different event loops,
which makes a client created inside an async fixture unusable from the test body.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

pytestmark = pytest.mark.asyncio

SAMPLES = [
    "Most creators burn out because they optimise for output instead of recovery.",
    "I batch on Sundays. Twelve pieces, zero weekday burnout. What do you think?",
    "You do not need more discipline, you need a system that survives a bad week.",
]


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# --------------------------------------------------------------------------- #
# Authentication must fail closed
# --------------------------------------------------------------------------- #

async def test_memory_requires_auth():
    async with _client() as anonymous:
        for path in ("/api/memory/stats", "/api/memory/assets"):
            assert (await anonymous.get(path)).status_code == 401


async def test_voice_requires_auth():
    async with _client() as anonymous:
        for path in ("/api/voice/profile", "/api/voice/profiles"):
            assert (await anonymous.get(path)).status_code == 401


async def test_invalid_token_rejected():
    async with _client() as anonymous:
        response = await anonymous.get(
            "/api/memory/stats", headers={"Authorization": "Bearer not-a-jwt"})
        assert response.status_code in (401, 403)


async def test_health_endpoints_are_open():
    async with _client() as anonymous:
        assert (await anonymous.get("/api/memory/health")).json()["status"] == "ok"
        assert (await anonymous.get("/api/voice/health")).json()["status"] == "ok"


# --------------------------------------------------------------------------- #
# Memory API
# --------------------------------------------------------------------------- #

async def test_ingest_then_search(client_a):
    async with client_a as ac:
        created = await ac.post("/api/memory/ingest", json={
            "title": "Launch retrospective",
            "text": ("I launched my SaaS landing page on a Tuesday and got 400 "
                     "signups in 48 hours. My mistake was waiting three weeks to "
                     "email my list."),
            "source_type": "note",
            "category": "lesson",
        })
        assert created.status_code == 201, created.text
        body = created.json()
        assert body["persisted"] is True
        assert body["chunks"] >= 1
        assert body["embedding_dimension"] == settings.embedding_dimension

        found = await ac.post("/api/memory/search", json={
            "query": "how many signups did the launch get",
            "top_k": 5,
            "purpose": "test",
        })
        assert found.status_code == 200, found.text
        results = found.json()["results"]
        assert results, "own memory must be retrievable"
        top = results[0]
        assert top["content_asset_id"] and top["chunk_id"]
        assert top["score"] is not None
        assert top["retrieval_purpose"] == "test"
        assert top["rank"] == 1


async def test_ingest_validates_input(client_a):
    async with client_a as ac:
        assert (await ac.post("/api/memory/ingest", json={})).status_code == 422
        assert (await ac.post("/api/memory/ingest", json={
            "title": "x", "text": ""})).status_code == 422
        assert (await ac.post("/api/memory/search", json={
            "query": ""})).status_code == 422
        assert (await ac.post("/api/memory/search", json={
            "query": "x", "top_k": 0})).status_code == 422
        assert (await ac.post("/api/memory/search", json={
            "query": "x", "top_k": 999})).status_code == 422


async def test_ingest_redacts_credentials(client_a):
    async with client_a as ac:
        created = await ac.post("/api/memory/ingest", json={
            "title": "Credential note",
            "text": ("The staging key is sk-abcdef1234567890abcdef0 and the oncall "
                     "is dev@example.com so rotate it before the release."),
            "category": "fact",
        })
        assert created.status_code == 201, created.text
        assert created.json()["redacted"] is True

        # The secret must not be retrievable later.
        found = await ac.post("/api/memory/search", json={
            "query": "staging deployment credential key", "top_k": 10})
        blob = " ".join(r["text"] for r in found.json()["results"])
        assert "sk-abcdef1234567890abcdef0" not in blob
        assert "dev@example.com" not in blob


async def test_stats_and_assets(client_a):
    async with client_a as ac:
        await ac.post("/api/memory/ingest", json={
            "title": "A note",
            "text": "Something worth remembering about audience retention."})

        stats = await ac.get("/api/memory/stats")
        assert stats.status_code == 200
        body = stats.json()
        assert body["assets"] == 1
        assert body["unembedded_chunks"] == 0
        assert body["stale_dimension_chunks"] == 0
        assert body["embedding_dimension"] == 768

        assets = await ac.get("/api/memory/assets")
        assert assets.status_code == 200
        assert len(assets.json()) == 1
        assert assets.json()[0]["chunk_count"] >= 1


async def test_delete_asset_then_gone(client_a):
    async with client_a as ac:
        created = await ac.post("/api/memory/ingest", json={
            "title": "Temporary",
            "text": "This memory will be deleted immediately after creation."})
        asset_id = created.json()["asset_id"]

        deleted = await ac.delete(f"/api/memory/assets/{asset_id}")
        assert deleted.status_code == 200, deleted.text
        assert deleted.json()["assets_deleted"] == 1

        again = await ac.delete(f"/api/memory/assets/{asset_id}")
        assert again.status_code == 404


async def test_summary_endpoint(client_a):
    async with client_a as ac:
        created = await ac.post("/api/memory/ingest", json={
            "title": "Summarised", "text": "A long enough note to summarise nicely."})
        asset_id = created.json()["asset_id"]

        summary = await ac.get(f"/api/memory/assets/{asset_id}/summary")
        assert summary.status_code == 200
        assert summary.json()["summary"]

        assert (await ac.get(
            f"/api/memory/assets/00000000-0000-0000-0000-000000000000/summary"
        )).status_code == 404


async def test_invalid_uuid_rejected(client_a):
    async with client_a as ac:
        assert (await ac.delete("/api/memory/assets/not-a-uuid")).status_code == 422


async def test_policy_check_endpoint(client_a):
    async with client_a as ac:
        ok = await ac.post("/api/memory/policy/check", json={
            "title": "t",
            "text": "I pre-warm my email list 48 hours before every launch.",
            "category": "lesson"})
        assert ok.status_code == 200 and ok.json()["should_persist"] is True

        leaky = await ac.post("/api/memory/policy/check", json={
            "title": "t",
            "text": "My key is sk-abcdef1234567890abcdef0 keep it safe.",
            "category": "fact"})
        assert leaky.status_code == 200
        assert leaky.json()["redacted"] is True


# --------------------------------------------------------------------------- #
# Cross-user isolation over HTTP
# --------------------------------------------------------------------------- #

async def test_user_b_cannot_see_user_a_memory(client_a, client_b):
    async with client_a as ac, client_b as bc:
        await ac.post("/api/memory/ingest", json={
            "title": "A private note",
            "text": "My private revenue number is eleven thousand per month."})

        assert (await bc.get("/api/memory/stats")).json()["assets"] == 0
        assert (await bc.get("/api/memory/assets")).json() == []
        found = await bc.post("/api/memory/search", json={
            "query": "private revenue number", "top_k": 10})
        assert found.status_code == 200
        assert found.json()["results"] == []


async def test_user_b_cannot_delete_user_a_asset(client_a, client_b):
    async with client_a as ac, client_b as bc:
        created = await ac.post("/api/memory/ingest", json={
            "title": "Protected",
            "text": "Creator A owns this and must keep it after the attempt."})
        asset_id = created.json()["asset_id"]

        # 404 rather than 403: the endpoint must not confirm another user's id.
        assert (await bc.delete(f"/api/memory/assets/{asset_id}")).status_code == 404
        assert (await bc.get(
            f"/api/memory/assets/{asset_id}/summary")).status_code == 404
        # Still present for its owner.
        assert (await ac.get(
            f"/api/memory/assets/{asset_id}/summary")).status_code == 200


# --------------------------------------------------------------------------- #
# Voice API
# --------------------------------------------------------------------------- #

async def test_create_and_read_voice_profile(client_a):
    async with client_a as ac:
        created = await ac.post("/api/voice/profile", json={
            "samples": [{"text": s} for s in SAMPLES]})
        assert created.status_code == 201, created.text
        profile = created.json()
        assert profile["style_name"] == "Primary Style"
        assert profile["is_primary"] is True
        assert profile["sample_count"] == 3
        assert set(profile["tone_fingerprint"]) >= {"formality", "conversational"}
        assert profile["forbidden_words"] == []
        assert profile["confidence"] > 0

        fetched = await ac.get("/api/voice/profile")
        assert fetched.status_code == 200
        assert fetched.json()["tone_fingerprint"] == profile["tone_fingerprint"]


async def test_voice_profile_requires_samples(client_a):
    async with client_a as ac:
        assert (await ac.post("/api/voice/profile", json={
            "samples": []})).status_code == 422


async def test_named_and_listed_voice_profiles(client_a):
    async with client_a as ac:
        await ac.post("/api/voice/profile", json={
            "samples": [{"text": s} for s in SAMPLES]})
        await ac.post("/api/voice/profile", json={
            "samples": [{"text": "வணக்கம் எல்லாருக்கும், இந்த வீடியோவில் பார்ப்போம்."}],
            "style_name": "Tamil Explainer"})

        listed = await ac.get("/api/voice/profiles")
        assert listed.status_code == 200
        names = {p["style_name"] for p in listed.json()}
        assert {"Primary Style", "Tamil Explainer"} <= names

        named = await ac.get("/api/voice/profile/Tamil Explainer")
        assert named.status_code == 200
        assert named.json()["style_name"] == "Tamil Explainer"

        removed = await ac.delete("/api/voice/profile/Tamil Explainer")
        assert removed.status_code == 200
        assert (await ac.get("/api/voice/profile/Tamil Explainer")).status_code == 404


async def test_voice_validate_draft(client_a):
    async with client_a as ac:
        await ac.post("/api/voice/profile", json={
            "samples": [{"text": s} for s in SAMPLES]})

        on_style = await ac.post("/api/voice/validate", json={"draft": SAMPLES[1]})
        assert on_style.status_code == 200
        assert on_style.json()["verdict"] == "strong_match"

        off_style = await ac.post("/api/voice/validate", json={
            "draft": ("Pursuant to clause seven of the schedule, the aforementioned "
                      "documentation shall be submitted without delay.")})
        assert off_style.status_code == 200
        assert off_style.json()["overall_score"] < on_style.json()["overall_score"]


async def test_voice_validate_without_profile_conflicts(client_a):
    async with client_a as ac:
        response = await ac.post("/api/voice/validate", json={"draft": "anything"})
        assert response.status_code == 409


async def test_voice_profile_missing_is_404(client_a):
    async with client_a as ac:
        assert (await ac.get("/api/voice/profile")).status_code == 404
        assert (await ac.get("/api/voice/profile/NoSuchStyle")).status_code == 404


async def test_voice_similar_memories_uses_shared_store(client_a):
    async with client_a as ac:
        await ac.post("/api/memory/ingest", json={
            "title": "Burnout note",
            "text": "Batching a dozen pieces into Sunday removed my weekday burnout."})
        response = await ac.get("/api/voice/similar-memories",
                                params={"q": "how do I stop burning out", "top_k": 3})
        assert response.status_code == 200
        assert isinstance(response.json(), list)


async def test_voice_profile_summary_uses_gateway(client_a):
    async with client_a as ac:
        await ac.post("/api/voice/profile", json={
            "samples": [{"text": s} for s in SAMPLES]})
        response = await ac.get("/api/voice/profile-summary")
        assert response.status_code == 200
        assert "summary" in response.json()


async def test_voice_profile_isolated_between_users(client_a, client_b):
    async with client_a as ac, client_b as bc:
        await ac.post("/api/voice/profile", json={
            "samples": [{"text": s} for s in SAMPLES]})

        assert (await bc.get("/api/voice/profile")).status_code == 404
        assert (await bc.get("/api/voice/profiles")).json() == []
        assert (await bc.delete("/api/voice/profile/Primary Style")).status_code == 404
        assert (await ac.get("/api/voice/profile")).status_code == 200


# --------------------------------------------------------------------------- #
# OpenAPI
# --------------------------------------------------------------------------- #

async def test_openapi_documents_phase2_routes():
    paths = app.openapi()["paths"]
    for expected in ("/api/memory/ingest", "/api/memory/search",
                     "/api/voice/profile", "/api/voice/validate"):
        assert expected in paths, f"{expected} missing from OpenAPI"


async def test_openapi_never_accepts_client_supplied_user_id():
    """No Phase 2 endpoint may take ownership from the client."""
    paths = app.openapi()["paths"]
    offenders = []
    for path, operations in paths.items():
        if not path.startswith(("/api/memory", "/api/voice")):
            continue
        for method, spec in operations.items():
            for param in spec.get("parameters") or []:
                if param.get("name") == "user_id":
                    offenders.append(f"{method.upper()} {path} (param)")
            for media in ((spec.get("requestBody") or {}).get("content") or {}).values():
                properties = (media.get("schema") or {}).get("properties") or {}
                if "user_id" in properties:
                    offenders.append(f"{method.upper()} {path} (body)")
    assert not offenders, f"user_id accepted from client: {offenders}"
