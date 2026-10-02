"""Thin Groq wrapper: JSON-mode chat with rate-limit backoff and JSON retry."""

import json
import threading
import time

from groq import APIConnectionError, APIStatusError, Groq, RateLimitError

from config import settings


class LLMConfigError(Exception):
    pass


class LLMError(Exception):
    pass


_client: Groq | None = None
_lock = threading.Lock()


def _get_client() -> Groq:
    global _client
    if not settings.groq_api_key:
        raise LLMConfigError("GROQ_API_KEY is not set in .env")
    with _lock:
        if _client is None:
            _client = Groq(api_key=settings.groq_api_key, max_retries=0)
    return _client


def _retry_after(err: RateLimitError, attempt: int) -> float:
    try:
        return min(float(err.response.headers.get("retry-after")) + 1, 90)
    except (TypeError, ValueError, AttributeError):
        return min(5 * 2**attempt, 90)


def chat_json(
    system: str,
    user: str,
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    attempts: int = 8,
) -> dict:
    """Call Groq in JSON mode and return the parsed object. The prompt must mention JSON."""
    client = _get_client()
    model = model or settings.llm_model
    extra = {}
    if "gpt-oss" in model:
        # reasoning models: hidden reasoning tokens count against the output budget
        extra = {"reasoning_effort": "low"}
        max_tokens += 2000
    bad_json = 0
    for attempt in range(attempts):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                response_format={"type": "json_object"},
                temperature=temperature,
                max_completion_tokens=max_tokens,
                **extra,
            )
        except RateLimitError as e:
            time.sleep(_retry_after(e, attempt))
            continue
        except APIConnectionError:
            time.sleep(3 * (attempt + 1))
            continue
        except APIStatusError as e:
            if e.status_code == 401:
                raise LLMConfigError("GROQ_API_KEY is invalid") from e
            if e.status_code == 404 and "model" in str(e):
                raise LLMConfigError(
                    f"Groq model '{model}' is not available — set LLM_MODEL / LLM_FAST_MODEL in .env "
                    "to a model listed at console.groq.com/docs/models"
                ) from e
            # retry server errors, and 400 json_validate_failed (model produced malformed JSON)
            if e.status_code >= 500 or (e.status_code == 400 and "json" in str(e).lower()):
                bad_json += 1
                if bad_json > 2:
                    raise LLMError(f"Groq error: {e}") from e
                continue
            raise LLMError(f"Groq error ({e.status_code}): {e}") from e

        content = resp.choices[0].message.content or ""
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            bad_json += 1
            if bad_json > 2:
                raise LLMError("Model returned invalid JSON three times")
    raise LLMError("Groq rate limit: gave up after repeated retries")
