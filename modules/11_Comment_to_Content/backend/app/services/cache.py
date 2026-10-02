import hashlib
import json
import logging
from typing import Optional, Any
from backend.app.db import SessionLocal
from backend.app.models import LLMCache

logger = logging.getLogger(__name__)

def compute_hash(data: Any) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def get_cached_llm_response(task_type: str, prompt_key_data: Any) -> Optional[dict]:
    key = f"{task_type}:{compute_hash(prompt_key_data)}"
    db = SessionLocal()
    try:
        entry = db.query(LLMCache).filter(LLMCache.cache_key == key).first()
        if entry and entry.response_json:
            return json.loads(entry.response_json)
    except Exception as e:
        logger.warning(f"Error reading from LLM cache: {e}")
    finally:
        db.close()
    return None

def set_cached_llm_response(task_type: str, prompt_key_data: Any, response_data: Any):
    key = f"{task_type}:{compute_hash(prompt_key_data)}"
    db = SessionLocal()
    try:
        response_json = json.dumps(response_data, default=str)
        entry = db.query(LLMCache).filter(LLMCache.cache_key == key).first()
        if entry:
            entry.response_json = response_json
        else:
            entry = LLMCache(
                cache_key=key,
                task_type=task_type,
                response_json=response_json
            )
            db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Error saving to LLM cache: {e}")
    finally:
        db.close()
