import sys
from pathlib import Path

# the backend runs with backend/ as the import root (uvicorn --app-dir backend)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
