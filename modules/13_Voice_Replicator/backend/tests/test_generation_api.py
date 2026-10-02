import os
import json
import pytest
from app.services.prompt_builder import PromptBuilder

def test_tc_gen_006_generate_without_style_profile_error(client):
    """TC-GEN-006 — Generate without an available style profile returns controlled 400 error"""
    proj_res = client.post("/api/projects", json={"name": "No Profile Project"})
    proj_id = proj_res.json()["id"]

    res = client.post(f"/api/projects/{proj_id}/generate", json={
        "topic": "AI Tools",
        "post_type": "educational"
    })
    assert res.status_code == 400
    assert "Style profile required" in res.json()["detail"]

def test_tc_gen_001_to_005_generation_pipeline(client):
    """TC-GEN-001 through 005 — Generate educational post with CTA requirement & target length"""
    proj_res = client.post("/api/projects", json={"name": "Gen Test Project"})
    proj_id = proj_res.json()["id"]

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "sample_datasets", "tech_creator.json")
    with open(dataset_path) as f:
        dataset = json.load(f)

    client.post(f"/api/projects/{proj_id}/posts/import", json=dataset)
    client.post(f"/api/projects/{proj_id}/analyze")

    gen_payload = {
        "topic": "5 essential tools for modern AI developers",
        "post_type": "educational",
        "cta_requirement": "Ask followers to save for later",
        "desired_length": "medium"
    }

    res = client.post(f"/api/projects/{proj_id}/generate", json=gen_payload)
    assert res.status_code == 200, res.text
    draft = res.json()

    assert "id" in draft
    assert draft["topic"] == gen_payload["topic"]
    assert "caption" in draft
    assert len(draft["caption"]) > 10

def test_tc_gen_prompt_builder():
    """Verify PromptBuilder constructs prompt containing Style Profile, examples & constraints"""
    style_profile = {
        "tone_scores": {"formality": 0.4, "conversational": 0.8},
        "caption_stats": {"average_word_count": 120, "preferred_range": [80, 160]},
        "emoji_profile": {"avg_count": 2, "top_emojis": ["🚀"]},
        "hashtag_profile": {"avg_count": 5, "common_hashtags": ["#ai"]},
        "cta_profile": {"frequency": 0.6},
        "common_structures": [["hook", "explanation", "cta"]]
    }
    examples = [{"id": "ex1", "post_type": "educational", "caption": "Example caption", "hashtags": ["#ai"], "similarity_score": 0.85}]

    prompt = PromptBuilder.build_generation_prompt(
        style_profile=style_profile,
        relevant_examples=examples,
        topic="Testing Prompts",
        post_type="educational"
    )

    assert "STRICT ORIGINALITY CONSTRAINTS" in prompt
    assert "TOPIC & USER CONSTRAINTS" in prompt
    assert "RELEVANT HISTORICAL EXAMPLES" in prompt
