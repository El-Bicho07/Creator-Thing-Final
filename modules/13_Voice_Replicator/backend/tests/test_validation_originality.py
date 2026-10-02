import pytest
from app.services.validation_service import ValidationService

def test_tc_val_001_to_004_validation_service():
    """TC-VAL-001 through 004 — Style Validation & Consistency Scoring"""
    style_profile = {
        "tone_scores": {"formality": 0.4, "conversational": 0.7, "educational": 0.6},
        "caption_stats": {"average_word_count": 100, "average_sentence_length": 14.0},
        "emoji_profile": {"avg_count": 2.0},
        "hashtag_profile": {"avg_count": 4.0},
        "cta_profile": {"frequency": 0.7}
    }
    historical_posts = [
        {"id": "p1", "caption": "5 AI Agent Frameworks You Need to Know in 2026. LangGraph, AutoGen, CrewAI."}
    ]

    draft_caption = "5 AI Agent Frameworks You Need to Know in 2026. LangGraph, AutoGen, CrewAI."
    draft_hashtags = ["#ai", "#python"]

    report = ValidationService.validate_draft(draft_caption, draft_hashtags, style_profile, historical_posts)

    assert "overall_score" in report
    assert "metrics_breakdown" in report
    assert "originality_status" in report
    assert report["overall_score"] >= 0.0

def test_tc_orig_001_and_002_copy_protection_originality():
    """TC-ORIG-001 & 002 — Originality Check & Copy Protection Flagging"""
    historical_posts = [
        {
            "id": "hist-1",
            "caption": "Why 90% of LLM Applications Fail in Production and How to Fix It. Most developers build a demo in a Jupyter notebook."
        }
    ]

    # TC-ORIG-001: Original text -> PASS
    original_caption = "Here is how to optimize RAG indexing for high performance multi-tenant database clusters."
    orig1 = ValidationService._check_originality(original_caption, historical_posts)
    assert orig1["status"] == "PASS"
    assert orig1["max_ngram_overlap"] == 0.0

    # TC-ORIG-002: Copied text -> FLAG / REJECT
    copied_caption = "Why 90% of LLM Applications Fail in Production and How to Fix It. Most developers build a demo in a Jupyter notebook."
    orig2 = ValidationService._check_originality(copied_caption, historical_posts)
    assert orig2["status"] in ["FLAG", "REJECT"]
    assert orig2["max_ngram_overlap"] > 30.0
