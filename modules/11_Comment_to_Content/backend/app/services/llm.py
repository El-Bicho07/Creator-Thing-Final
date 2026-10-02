import json
import logging
import re
from typing import Type, TypeVar, Optional, Any, List
from pydantic import BaseModel, ValidationError

from backend.app.config import settings
from backend.app.services.cache import get_cached_llm_response, set_cached_llm_response

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class LLMService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.ANTHROPIC_MODEL
        self._client = None
        if self.api_key and self.api_key != "your_anthropic_api_key_here":
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Anthropic client: {e}")

    @property
    def is_available(self) -> bool:
        return self._client is not None

    def generate_structured(
        self,
        task_type: str,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        fallback_fn: Optional[Any] = None,
        max_retries: int = 2
    ) -> T:
        """
        Calls Claude with structured output expectation, caches response,
        validates via Pydantic model with retry logic.
        Falls back to fallback_fn if Claude API is not configured or errors out.
        """
        cache_key_data = {
            "task_type": task_type,
            "model": self.model,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt
        }
        
        # 1. Check persistent cache
        cached = get_cached_llm_response(task_type, cache_key_data)
        if cached:
            try:
                return response_model.model_validate(cached)
            except Exception as e:
                logger.warning(f"Cache validation error for {task_type}: {e}")

        # 2. If Anthropic client is not available, execute fallback generator
        if not self._client:
            logger.info(f"Anthropic API key not configured. Using grounded heuristic engine for {task_type}.")
            if fallback_fn:
                result = fallback_fn()
                validated = response_model.model_validate(result)
                set_cached_llm_response(task_type, cache_key_data, validated.model_dump())
                return validated
            raise ValueError("No Anthropic API key provided and no fallback provided.")

        # 3. Call Anthropic with retries
        current_user_prompt = user_prompt
        schema_json = json.dumps(response_model.model_json_schema(), indent=2)
        full_system = f"{system_prompt}\n\nCRITICAL: Respond ONLY with a valid JSON object conforming strictly to this JSON Schema:\n{schema_json}\nDo not wrap in markdown quotes if possible, or use standard ```json ... ``` formatting. Output MUST be valid parseable JSON."

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                response = self._client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    temperature=0.2,
                    system=full_system,
                    messages=[{"role": "user", "content": current_user_prompt}]
                )
                raw_text = response.content[0].text.strip()
                
                # Extract JSON if wrapped in markdown code fence
                json_str = raw_text
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
                if match:
                    json_str = match.group(1).strip()
                
                parsed_dict = json.loads(json_str)
                validated = response_model.model_validate(parsed_dict)
                
                # Cache on success
                set_cached_llm_response(task_type, cache_key_data, validated.model_dump())
                return validated

            except (json.JSONDecodeError, ValidationError) as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed for {task_type} validation: {e}")
                current_user_prompt = f"{user_prompt}\n\nYour previous response failed validation with error: {str(e)}. Please correct your output and return strictly valid JSON matching the schema."
            except Exception as e:
                logger.error(f"Anthropic API error on attempt {attempt + 1}: {e}")
                last_error = e
                break

        # Fallback if Claude call or parsing exhausted
        if fallback_fn:
            logger.warning(f"Using fallback engine for {task_type} after API failure: {last_error}")
            result = fallback_fn()
            validated = response_model.model_validate(result)
            set_cached_llm_response(task_type, cache_key_data, validated.model_dump())
            return validated

        raise RuntimeError(f"Failed to generate valid structured output for {task_type}: {last_error}")

llm_service = LLMService()
