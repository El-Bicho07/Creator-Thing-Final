"""The Studio capability contract and registry.

Every Studio capability is a small, self-describing object:

```text
StudioCapability
    id                  stable identifier
    name / description  human-facing
    donor               which donor module informed it
    classification      PORT / ADAPT / REBUILD / NEW
    input_model         Pydantic model -> validated before any LLM call
    output_model        Pydantic model for the response
    requires_context    which context blocks the prompt needs
    execute()           the implementation
```

The orchestrator dispatches by `id` through the registry and never contains a
donor-specific conditional. That is the point: adding a capability means adding a
capability, not editing the orchestrator.

`StudioCapabilityRegistry` is deliberately process-local and immutable after
registration. It is not a plugin system — Studio capabilities are platform code,
so a registry that could be mutated at runtime would only make the set of
reachable capabilities less predictable.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence, Type

from pydantic import BaseModel

from app.core.logging import get_logger
from app.llm import LLMRequest, get_llm_gateway
from app.llm.contracts import GenerationStatus
from app.studio.capabilities import validation
from app.studio.context import CreatorContext

logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Contract
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class CapabilityContext:
    """Everything a capability is allowed to reach.

    Passed explicitly so a capability cannot reach the database, the memory
    engine or the voice engine except through `context` and the shared services
    on `StudioRuntime`.
    """

    user_id: uuid.UUID
    db: Any
    session: Any                      # StudioSessionRecord
    repository: Any                   # StudioRepository
    context: CreatorContext
    brief: str
    platform: Optional[str] = None
    tone: Optional[str] = None
    goal: Optional[str] = None
    duration_sec: Optional[int] = None
    source_text: Optional[str] = None  # for refine / critique of arbitrary text


@dataclass(frozen=True)
class CapabilityOutcome:
    """What a capability produced.

    `output` is the validated result. `version_text` is what gets persisted as the
    new `content_assets` row; capabilities that produce a list (ideas, hooks) set it
    to a rendered summary so there is still an artifact in the session.
    """

    output: Any
    version_text: str = ""
    warnings: List[str] = field(default_factory=list)
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class CapabilityError(Exception):
    """Raised when a capability cannot produce a usable result."""

    def __init__(self, message: str, *, status: str = "error") -> None:
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class StudioCapability:
    id: str
    name: str
    description: str
    execute: Callable[[CapabilityContext, BaseModel], CapabilityOutcome]
    input_model: Type[BaseModel]
    output_model: Optional[Type[BaseModel]] = None
    donor: Sequence[str] = ()
    classification: str = "NEW"
    requires_context: Sequence[str] = ()
    supported_platforms: Sequence[str] = ()
    supports_refinement: bool = False

    def validate_input(self, payload: Dict[str, Any]) -> BaseModel:
        """Validate capability input, raising a 422-shaped error when invalid."""
        try:
            return self.input_model(**(payload or {}))
        except Exception as exc:
            raise CapabilityError(
                f"Invalid input for capability '{self.id}': {exc}",
                status="invalid_input",
            ) from exc

    def info(self) -> Dict[str, Any]:
        input_schema = self.input_model.model_json_schema()
        output_schema = (
            self.output_model.model_json_schema()
            if self.output_model is not None
            else {}
        )
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "donor": list(self.donor),
            "classification": self.classification,
            "requires_context": list(self.requires_context),
            "input_schema": input_schema,
            "output_schema": output_schema,
            "supported_platforms": list(self.supported_platforms),
            "supports_refinement": self.supports_refinement,
        }


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #

class StudioCapabilityRegistry:
    """Immutable-by-convention id -> capability map."""

    def __init__(self, capabilities: Sequence[StudioCapability] = ()) -> None:
        self._capabilities: Dict[str, StudioCapability] = {}
        for capability in capabilities:
            self.register(capability)

    def register(self, capability: StudioCapability) -> None:
        if capability.id in self._capabilities:
            raise ValueError(f"duplicate capability id: {capability.id}")
        self._capabilities[capability.id] = capability

    def get(self, capability_id: str) -> Optional[StudioCapability]:
        return self._capabilities.get(capability_id)

    def require(self, capability_id: str) -> StudioCapability:
        capability = self.get(capability_id)
        if capability is None:
            available = ", ".join(sorted(self._capabilities))
            raise CapabilityError(
                f"Unknown capability '{capability_id}'. Available: {available}",
                status="unknown_capability",
            )
        return capability

    def list(self) -> List[StudioCapability]:
        return [self._capabilities[k] for k in sorted(self._capabilities)]

    def ids(self) -> List[str]:
        return sorted(self._capabilities)

    def infos(self) -> List[Dict[str, Any]]:
        return [cap.info() for cap in self.list()]

    def __len__(self) -> int:
        return len(self._capabilities)

    def __contains__(self, capability_id: object) -> bool:
        return capability_id in self._capabilities


# --------------------------------------------------------------------------- #
# Gateway invocation helper
# --------------------------------------------------------------------------- #

async def call_gateway(
    capability: StudioCapability,
    ctx: CapabilityContext,
    *,
    prompt_name: str,
    prompt_version: str,
    purpose: str,
    input_data: Dict[str, Any],
    response_model: Type[BaseModel],
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
) -> BaseModel:
    """Invoke the shared LLM Gateway on behalf of a capability.

    This is the **only** place Studio talks to a model. There is deliberately no
    provider import anywhere under `app/studio`: routing, fallback, retry bounds,
    cost accounting and `ai_calls` logging are the Gateway's job.
    """
    gateway = get_llm_gateway()
    request = LLMRequest(
        purpose=purpose,
        feature="studio",
        prompt_name=prompt_name,
        prompt_version=prompt_version,
        system_instructions=None,
        input_data=input_data,
        temperature=temperature,
        max_tokens=max_tokens,
        metadata={
            "capability": capability.id,
            "session_id": str(ctx.session.id),
            "donor": list(capability.donor),
        },
    )

    try:
        result = await gateway.generate(
            user_id=ctx.user_id,
            request=request,
            response_model=response_model,
            db=ctx.db,
        )
    except Exception as exc:
        status = getattr(exc, "status", None) or getattr(
            exc, "status_code", None
        )
        raise CapabilityError(
            _friendly(exc),
            status=str(status) if status else "provider_error",
        ) from exc

    if isinstance(result, GenerationStatus):
        raise CapabilityError(f"Generation ended in status {result}", status="error")

    return result


def _friendly(exc: Exception) -> str:
    """Map a provider/gateway failure to an actionable creator-facing message.

    Never surfaces a stack trace or a credential. The original exception is kept
    as the cause for logs.
    """
    text = str(exc).lower()
    if "timeout" in text or "timed out" in text:
        return "The generation timed out. Try a shorter request or retry."
    if "rate" in text and "limit" in text:
        return "Rate limited by the provider. Wait a moment and retry."
    if "api key" in text or "unauthor" in text or "credential" in text:
        return "The AI provider is not configured correctly. Check server settings."
    if "provider" in text or "unavailable" in text:
        return "The AI provider is unavailable right now. Try again shortly."
    if "schema" in text or "validation" in text:
        return "The generated output did not match the expected format. Retry."
    return "Generation failed. Please retry."


# --------------------------------------------------------------------------- #
# Shared post-processing
# --------------------------------------------------------------------------- #

def render_lines(items: Sequence[Any], *, limit: int = 20) -> str:
    """Render a list result as plain text for the persisted version body."""
    lines: List[str] = []
    for item in list(items)[:limit]:
        if isinstance(item, dict):
            primary = (
                item.get("title")
                or item.get("text")
                or item.get("angle")
                or item.get("hook")
                or item.get("content")
                or ""
            )
            lines.append(str(primary))
        else:
            lines.append(str(item))
    return "\n\n".join(line for line in lines if line.strip())


__all__ = [
    "CapabilityContext",
    "CapabilityOutcome",
    "CapabilityError",
    "StudioCapability",
    "StudioCapabilityRegistry",
    "call_gateway",
    "render_lines",
    "validation",
]
