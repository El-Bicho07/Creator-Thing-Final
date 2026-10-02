"""ChatGroq factory for the agents, plus the middleware every agent shares."""

from functools import lru_cache

from groq import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    NotFoundError,
    RateLimitError,
)
from langchain.agents.middleware import (
    ClearToolUsesEdit,
    ContextEditingMiddleware,
    ModelCallLimitMiddleware,
    ModelRetryMiddleware,
    ToolCallLimitMiddleware,
)
from langchain_groq import ChatGroq

from ai.llm import LLMConfigError, LLMError
from config import settings


@lru_cache(maxsize=4)
def chat_model(fast: bool = False, temperature: float = 0.2) -> ChatGroq:
    """Main model (reasoning, answers) or fast model (bulk verification)."""
    if not settings.groq_api_key:
        raise LLMConfigError("GROQ_API_KEY is not set in .env")
    model = settings.llm_fast_model if fast else settings.llm_model
    extra = {"reasoning_effort": "low"} if "gpt-oss" in model else {}
    return ChatGroq(
        model=model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        max_tokens=settings.agent_max_output_tokens,
        # the groq client honours retry-after on 429s; ModelRetryMiddleware covers longer throttling
        max_retries=4,
        **extra,
    )


def _transient(err: Exception) -> bool:
    if isinstance(err, (RateLimitError, APIConnectionError, InternalServerError)):
        return True
    # gpt-oss occasionally emits a malformed tool call or stray reasoning text; a fresh sample usually fixes it
    return isinstance(err, BadRequestError) and ("tool_use_failed" in str(err) or "output_parse_failed" in str(err))


def guardrails(model_calls: int, tool_calls: int) -> list:
    """Stop runaway loops (every loop costs Groq rate limit), keep each request inside the token budget,
    and retry transient API failures."""
    return [
        # every step resends the whole conversation; once it grows past the budget, replace all but the
        # two latest tool results with a placeholder (the task prompt and the agent's own reasoning stay)
        ContextEditingMiddleware(edits=[ClearToolUsesEdit(trigger=settings.agent_context_tokens, keep=2)]),
        ModelRetryMiddleware(
            max_retries=3,
            retry_on=_transient,
            on_failure="error",
            initial_delay=5.0,
            max_delay=60.0,
        ),
        ModelCallLimitMiddleware(run_limit=model_calls, exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=tool_calls, exit_behavior="continue"),
    ]


def as_app_error(err: Exception) -> Exception:
    """Map Groq SDK errors onto the errors the API layer already turns into HTTP responses."""
    if isinstance(err, (LLMConfigError, LLMError)):
        return err
    if isinstance(err, AuthenticationError):
        return LLMConfigError("GROQ_API_KEY is invalid")
    if isinstance(err, NotFoundError) and "model" in str(err):
        return LLMConfigError(
            "Groq model not available — set LLM_MODEL / LLM_FAST_MODEL in .env "
            "to a model listed at console.groq.com/docs/models"
        )
    if isinstance(err, RateLimitError):
        return LLMError("Groq rate limit: gave up after repeated retries. Wait a minute and try again.")
    if isinstance(err, APIStatusError) and err.status_code == 413:
        return LLMError(
            "The request was larger than Groq's tokens-per-minute limit. Lower AGENT_CONTEXT_TOKENS / "
            "AGENT_MAX_OUTPUT_TOKENS in .env, or upgrade the Groq tier."
        )
    if isinstance(err, APIStatusError):
        return LLMError(f"Groq error ({err.status_code}): {err}")
    if isinstance(err, APIConnectionError):
        return LLMError("Could not reach Groq — check your internet connection.")
    return err
