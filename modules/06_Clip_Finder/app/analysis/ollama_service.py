import json
import requests
from typing import Tuple, List, Optional, Dict, Any
from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL

def check_ollama_status(target_model: Optional[str] = None) -> Tuple[bool, List[str], str]:
    """
    Check if local Ollama server is running and list available models.
    Returns: (is_running, available_models, status_message)
    """
    model_to_check = target_model or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            model_names = [m for m in models if m]
            
            if not model_names:
                msg = f"Ollama is running at {OLLAMA_BASE_URL}, but no models are downloaded yet. Run: `ollama pull {model_to_check}`"
                return True, [], msg
            
            # Flexible matching (e.g. 'llama3.2' matches 'llama3.2:latest')
            matching = [
                m for m in model_names
                if model_to_check in m or m in model_to_check or m.split(":")[0] == model_to_check.split(":")[0]
            ]
            if not matching:
                msg = f"Ollama is running, but model '{model_to_check}' was not found. Installed models: {', '.join(model_names)}. Select an installed model in sidebar or run: `ollama pull {model_to_check}`"
                return True, model_names, msg
            else:
                matched_name = matching[0]
                msg = f"Ollama is ready at {OLLAMA_BASE_URL} (Active Model: {matched_name})"
                return True, model_names, msg
        else:
            return False, [], f"Ollama server returned status code {response.status_code}"
    except requests.exceptions.RequestException:
        return False, [], f"Ollama server is not running at {OLLAMA_BASE_URL}. Please start Ollama locally (`ollama serve`)."


def generate_ollama_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.2,
    timeout: int = 120
) -> str:
    """
    Send prompt to local Ollama server and return response string.
    """
    model = model_name or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/api/generate"
    
    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature
        }
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        response = requests.post(url, json=payload, timeout=timeout)
        if response.status_code == 200:
            res_json = response.json()
            return res_json.get("response", "").strip()
        else:
            raise RuntimeError(f"Ollama API error ({response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to connect to Ollama at {OLLAMA_BASE_URL}: {e}")
