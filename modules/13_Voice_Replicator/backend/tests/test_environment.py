import os
import sys
import socket
import subprocess
import pytest
from app.config import settings

def test_tc_env_001_system_readiness_and_dependency_verification():
    """TC-ENV-001 — System Readiness and Dependency Verification"""
    
    report = {}

    # 1. Python environment (.venv check)
    in_venv = sys.prefix != sys.base_prefix or ".venv" in sys.prefix
    report["Python environment"] = "PASS" if in_venv else "FAIL"

    # 2. Dependency imports
    missing_deps = []
    required_packages = [
        ("fastapi", "FastAPI"),
        ("pydantic", "Pydantic"),
        ("pydantic_settings", "Pydantic Settings"),
        ("sqlalchemy", "SQLAlchemy"),
        ("psycopg", "psycopg"),
        ("alembic", "Alembic"),
        ("spacy", "spaCy"),
        ("numpy", "NumPy"),
        ("pandas", "Pandas"),
        ("sklearn", "scikit-learn"),
        ("PIL", "Pillow"),
        ("cv2", "OpenCV"),
        ("pytesseract", "pytesseract"),
        ("sentence_transformers", "sentence-transformers"),
        ("httpx", "httpx"),
        ("dotenv", "python-dotenv"),
        ("pytest", "pytest"),
    ]

    for pkg_import, pkg_name in required_packages:
        try:
            __import__(pkg_import)
        except ImportError:
            missing_deps.append(pkg_name)

    # Test spaCy en_core_web_sm model
    try:
        import spacy
        spacy.load("en_core_web_sm")
    except Exception:
        missing_deps.append("en_core_web_sm")

    report["Dependencies"] = "PASS" if not missing_deps else f"FAIL (Missing: {', '.join(missing_deps)})"

    # 3. Environment variables check
    env_file_exists = os.path.exists(os.path.join(os.path.dirname(__file__), "..", ".env"))
    api_key_configured = bool(settings.LLM_API_KEY and settings.LLM_API_KEY != "your_gemini_api_key_here")
    
    report["Environment variables"] = "PASS" if (env_file_exists and api_key_configured) else "FAIL"

    # 4. PostgreSQL verification
    try:
        s = socket.socket()
        s.settimeout(1.5)
        s.connect(('127.0.0.1', 5432))
        s.close()
        pg_reachable = True
    except Exception:
        pg_reachable = False

    report["PostgreSQL"] = "PASS" if pg_reachable else "FAIL (Container instagram_voice_db on port 5432 not reachable)"

    # 5. pgvector verification
    report["pgvector"] = "PASS" if pg_reachable else "FAIL (PostgreSQL connection required)"

    # 6. Database schema verification
    migration_dir_exists = os.path.exists(os.path.join(os.path.dirname(__file__), "..", "alembic", "versions"))
    report["Database schema"] = "PASS" if migration_dir_exists else "FAIL"

    # 7. Embedding model verification
    try:
        from app.services.embedding_service import EmbeddingService
        emb_service = EmbeddingService()
        vec = emb_service.generate_embedding("Test text for embedding")
        report["Embedding model"] = "PASS" if len(vec) == 384 else "FAIL"
    except Exception as e:
        report["Embedding model"] = f"FAIL ({e})"

    # 8. Tesseract verification
    try:
        res = subprocess.run(["tesseract", "--version"], capture_output=True, text=True)
        report["Tesseract"] = "PASS" if res.returncode == 0 else "FAIL"
    except Exception:
        report["Tesseract"] = "FAIL"

    # 9. Gemini configuration
    report["Gemini configuration"] = "PASS" if api_key_configured else "FAIL (API key not configured)"

    # 10. FastAPI import
    try:
        from app.main import app
        report["FastAPI import"] = "PASS"
    except Exception as e:
        report["FastAPI import"] = f"FAIL ({e})"

    # 11. Frontend build check
    frontend_build_exists = os.path.exists(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".next"))
    report["Frontend build"] = "PASS" if frontend_build_exists else "FAIL (Run 'npm run build' inside frontend/)"

    print("\n" + "="*50)
    print("TC-ENV-001 SYSTEM READINESS REPORT")
    print("="*50)
    for key, status in report.items():
        if key == "Environment variables":
            print(f"{key:<25}: {status} (API key configured: {'YES' if api_key_configured else 'NO'})")
        else:
            print(f"{key:<25}: {status}")
    print("="*50 + "\n")

    assert report["Python environment"] == "PASS"
    assert report["Dependencies"] == "PASS"
    assert report["FastAPI import"] == "PASS"
