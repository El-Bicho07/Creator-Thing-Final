import pytest
from app.services.embedding_service import EmbeddingService

def test_tc_embed_001_embedding_generation():
    """TC-EMBED-001 — Generate embedding for text (384 float dimensions)"""
    service = EmbeddingService()
    text = "5 AI Agent Frameworks You Need to Know in 2026"
    vec = service.generate_embedding(text)
    
    assert isinstance(vec, list)
    assert len(vec) == 384
    assert any(val != 0.0 for val in vec)

def test_tc_embed_005_empty_text_embedding():
    """TC-EMBED-005 — Empty text embedding handling"""
    service = EmbeddingService()
    vec = service.generate_embedding("")
    assert len(vec) == 384
