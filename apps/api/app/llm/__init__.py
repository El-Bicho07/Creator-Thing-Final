"""Centralized AI Gateway (ADR-003).

The only supported entry point for LLM calls in the platform.
"""
from app.llm.contracts import (
    GenerationStatus,
    LLMRequest,
    LLMResponse,
    ProviderRequest,
    ProviderResponse,
    PromptTemplate,
    TokenUsage,
)
from app.llm.gateway import LLMGateway, get_llm_gateway, set_llm_gateway

__all__ = [
    "LLMGateway",
    "get_llm_gateway",
    "set_llm_gateway",
    "LLMRequest",
    "LLMResponse",
    "ProviderRequest",
    "ProviderResponse",
    "PromptTemplate",
    "TokenUsage",
    "GenerationStatus",
]
