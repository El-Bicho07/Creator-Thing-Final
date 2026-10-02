import os
import json
import pytest
from app.services.text_analyzer import TextAnalyzer
from app.services.content_analyzer import ContentAnalyzer

def test_tc_nlp_001_to_009_text_analyzer_metrics():
    """TC-NLP-001 through 009 — Deterministic & Statistical NLP Text Analysis"""
    caption = (
        "Are you still struggling with AI agent architecture? 🚀\n\n"
        "I spent 3 years building LLM pipelines for high-growth startups, and we learned the hard way.\n\n"
        "Here are 3 tips to scale your system:\n"
        "• Use structured JSON guardrails\n"
        "• Index document vectors in pgvector\n"
        "• Monitor token usage per query\n\n"
        "Which framework are you using? Drop a comment below! 👇"
    )
    hashtags = ["#ai", "#developers", "#tech"]

    tf = TextAnalyzer.extract_features(caption, hashtags)

    # TC-NLP-001: Word count
    assert tf["word_count"] > 30

    # TC-NLP-002: Sentence count
    assert tf["sentence_count"] >= 3

    # TC-NLP-003: Paragraph detection
    assert tf["paragraph_count"] >= 4

    # TC-NLP-004: Punctuation frequency
    assert tf["punctuation_counts"]["question_mark"] >= 2

    # TC-NLP-005: Emoji detection & frequency
    assert tf["emoji_count"] >= 2
    assert "🚀" in tf["emojis"]

    # TC-NLP-006: Hashtag detection
    assert tf["hashtag_count"] == 3

    # TC-NLP-007: First person pronoun analysis ("I", "we")
    assert tf["first_person_ratio"] > 0.0

    # TC-NLP-008: Second person pronoun analysis ("you", "your")
    assert tf["second_person_ratio"] > 0.0

    # TC-NLP-009: Tone indicators (0.0 to 1.0)
    assert 0.0 <= tf["formality_score"] <= 1.0
    assert 0.0 <= tf["conversational_score"] <= 1.0
    assert 0.0 <= tf["educational_score"] <= 1.0
    assert 0.0 <= tf["promotional_score"] <= 1.0
    assert 0.0 <= tf["storytelling_score"] <= 1.0

def test_tc_content_001_and_002_structure_analysis():
    """TC-CONTENT-001 & 002 — Caption Content Structure Classification"""
    caption = "5 AI Agent Frameworks You Need to Know 🚀\n\nLangGraph, AutoGen, CrewAI.\n\nComment below!"
    tf = TextAnalyzer.extract_features(caption)
    
    # TC-CONTENT-001: Structure components
    assert "hook" in tf["structure_components"]
    assert "cta" in tf["structure_components"]

    # TC-CONTENT-002: Very short caption gracefully handled
    short_tf = TextAnalyzer.extract_features("Hello world")
    assert short_tf["word_count"] == 2
    assert isinstance(short_tf["structure_components"], list)

def test_tc_style_001_and_002_style_profile_apis(client):
    """TC-STYLE-001 & 002 — Trigger and retrieve Style Profile via API"""
    proj_res = client.post("/api/projects", json={"name": "Style Profile Test Project"})
    proj_id = proj_res.json()["id"]

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "sample_datasets", "tech_creator.json")
    with open(dataset_path) as f:
        dataset = json.load(f)

    client.post(f"/api/projects/{proj_id}/posts/import", json=dataset)

    # TC-STYLE-001: Trigger analysis
    analyze_res = client.post(f"/api/projects/{proj_id}/analyze")
    assert analyze_res.status_code == 200
    sp = analyze_res.json()
    assert "tone_scores" in sp
    assert "caption_stats" in sp
    assert "common_structures" in sp

    # TC-STYLE-002: GET style profile
    get_sp_res = client.get(f"/api/projects/{proj_id}/style-profile")
    assert get_sp_res.status_code == 200
    assert get_sp_res.json()["project_id"] == proj_id
