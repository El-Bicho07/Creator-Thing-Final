import sys
import os
import socket
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

def is_postgres_reachable() -> bool:
    try:
        s = socket.socket()
        s.settimeout(1.0)
        s.connect(('127.0.0.1', 5432))
        s.close()
        return True
    except Exception:
        return False

# Pytest mark for PostgreSQL dependency
requires_postgres = pytest.mark.skipif(
    not is_postgres_reachable(),
    reason="PostgreSQL database instagram_voice on port 5432 is not reachable (Docker container instagram_voice_db requires user permission to start)"
)

@pytest.fixture(autouse=True)
def skip_if_postgres_missing(request):
    """Automatically skip database-dependent API tests if PostgreSQL is unreachable."""
    if "requires_postgres" in request.keywords or "client" in request.fixturenames:
        if not is_postgres_reachable():
            pytest.skip("PostgreSQL database instagram_voice on port 5432 is not reachable (Docker container instagram_voice_db requires starting)")

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_tech_post_data():
    return {
        "id": "test-post-001",
        "caption": "5 AI Agent Frameworks You Need to Know in 2026 🚀\n\nBuilding autonomous AI systems is moving faster than ever. If you're still writing custom wrapper scripts from scratch, you are losing hours of development time.\n\nHere are the top 5 frameworks reshaping AI engineering:\n\n• LangGraph — State graph orchestration\n• AutoGen — Multi-agent conversation\n• CrewAI — Role-playing AI agents\n• Semantic Kernel — Enterprise-grade AI\n• LlamaIndex — Data-centric agentic RAG\n\nWhich framework are you building with this week? Drop a comment below! 👇",
        "hashtags": ["#ai", "#python", "#tech"],
        "media_path": "",
        "post_type": "educational",
        "published_at": "2026-01-10"
    }
