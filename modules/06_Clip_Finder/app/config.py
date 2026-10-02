import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")




# Clip limits
MIN_CLIP_DURATION = int(os.getenv("MIN_CLIP_DURATION", "15"))
MAX_CLIP_DURATION = int(os.getenv("MAX_CLIP_DURATION", "90"))

# Directories
DATA_DIR = BASE_DIR / os.getenv("DATA_DIR", "data")
UPLOADS_DIR = DATA_DIR / "uploads"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"
CLIPS_DIR = DATA_DIR / "clips"

def ensure_directories():
    """Ensure required data directories exist."""
    for directory in [DATA_DIR, UPLOADS_DIR, TRANSCRIPTS_DIR, CLIPS_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

ensure_directories()
