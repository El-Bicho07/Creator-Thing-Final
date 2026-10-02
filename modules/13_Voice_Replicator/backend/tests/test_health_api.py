import pytest

def test_tc_health_001_health_endpoint(client):
    """TC-HEALTH-001 — Call GET /api/health and verify status payload"""
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "status" in data
    assert data["api"] == "online"
    assert "database" in data
    assert "pgvector" in data
    assert "llm_configured" in data
