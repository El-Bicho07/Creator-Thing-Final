"""Pydantic contracts for the centralized LLM Gateway (ADR-003).

Feature code depends on these models only. Provider-specific payloads never
escape the adapter layer.
"""
from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class GenerationStatus(str, Enum):
    SUCCESS = "success"
    VALIDATION_FAILED = "validation_failed"
    REPAIR_FAILED = "repair_failed"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    PROVIDER_ERROR = "provider_error"
    CACHE_HIT = "cache_hit"
    LIMIT_EXCEEDED = "limit_exceeded"


class LLMRequest(BaseModel):
    """A single structured generation request."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    # --- purpose / attribution (all required, all logged) ---
    purpose: str = Field(..., description="Stable purpose id, e.g. 'voice_analysis'")
    feature: str = Field(..., description="Feature id, e.g. 'voice'")

    # --- prompt identity ---
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None

    # --- routing ---
    provider: Optional[str] = None
    model: Optional[str] = None

    # --- payload ---
    system_instructions: Optional[str] = None
    user_content: str = ""
    input_data: Dict[str, Any] = Field(default_factory=dict)

    # --- generation configuration ---
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout_seconds: Optional[float] = None

    # --- structured output ---
    response_schema: Optional[Dict[str, Any]] = None
    repair_instructions: Optional[str] = None

    # --- metadata (never contains secrets) ---
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def cache_key(self) -> str:
        import hashlib
        import json

        material = json.dumps(
            {
                "purpose": self.purpose,
                "prompt_name": self.prompt_name,
                "prompt_version": self.prompt_version,
                "system": self.system_instructions,
                "user": self.user_content,
                "input": self.input_data,
                "schema": self.response_schema,
            },
            sort_keys=True,
            default=str,
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


class LLMResponse(BaseModel):
    """Normalised provider response."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    content: str = ""
    structured_output: Optional[Dict[str, Any]] = None
    validated_output: Optional[Any] = None

    provider: str = ""
    model: str = ""

    usage: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: int = 0
    estimated_cost_usd: float = 0.0

    status: GenerationStatus = GenerationStatus.SUCCESS
    error: Optional[str] = None

    trace_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    attempts: int = 0
    repaired: bool = False
    cached: bool = False
    created_at: float = Field(default_factory=time.time)


class ProviderRequest(BaseModel):
    """Normalised request handed to a `ProviderAdapter`."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    model: str
    system_instructions: Optional[str] = None
    user_content: str = ""
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    response_schema: Optional[Dict[str, Any]] = None
    timeout_seconds: float = 30.0


class ProviderResponse(BaseModel):
    """Normalised adapter response. Adapters must never raise provider types."""

    content: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    provider: str = ""
    model: str = ""


class PromptTemplate(BaseModel):
    """A versioned prompt asset from `packages/prompts/`."""

    model_config = ConfigDict(extra="allow")

    name: str
    version: str
    purpose: str
    system: Optional[str] = None
    template: str = ""
    schema_ref: Optional[str] = None
    description: Optional[str] = None
    variables: List[str] = Field(default_factory=list)


#: Approximate USD per 1K tokens: (input, output).
#: Used for cost accounting only; update when provider pricing changes.
PRICING_USD_PER_1K: Dict[str, Dict[str, float]] = {
    "mock": {"input": 0.0, "output": 0.0},
    "gemini": {"input": 0.00015, "output": 0.0006},
    "anthropic": {"input": 0.003, "output": 0.015},
    "groq": {"input": 0.00059, "output": 0.00079},
}


def estimate_cost_usd(provider: str, usage: TokenUsage) -> float:
    """Best-effort cost estimate. Returns 0.0 when pricing is unknown."""
    rates = PRICING_USD_PER_1K.get(provider)
    if not rates:
        return 0.0
    return round(
        usage.input_tokens / 1000.0 * rates["input"]
        + usage.output_tokens / 1000.0 * rates["output"],
        6,
    )