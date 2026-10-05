"""Deterministic in-process LLM provider.

ADR-006 records that **no production LLM credential is configured** (Gemini,
Anthropic and Groq keys are all absent). Rather than block Phase 2 on
credentials, the gateway ships this adapter so the architecture, structured
output validation, repair, retry, fallback, usage accounting and the Voice /
Memory engines can all be built and tested end to end.

Determinism: the same request always yields byte-identical output, which makes
it usable in tests. When real credentials land, switching providers is a
configuration change (`LLM_PROVIDER=gemini`) -- no feature code changes.

If a request declares a JSON schema, the mock synthesises a **schema-valid**
payload so the validation path is genuinely exercised. This is test scaffolding,
never a claim of model quality.
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.core.errors import AITimeoutError
from app.llm.contracts import ProviderRequest, ProviderResponse
from app.llm.providers.base import ProviderAdapter


class MockLLMProvider(ProviderAdapter):
    name = "mock"

    def __init__(self, api_key: str | None = None) -> None:
        super().__init__(api_key)

    @property
    def is_configured(self) -> bool:
        # The mock needs no credential, so it is always available.
        return True

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        if request.response_schema:
            content = json.dumps(self._synthesize(request.response_schema),
                                 sort_keys=True)
        else:
            content = self._text(request)

        # Deterministic, proportional "usage" so cost/latency accounting and
        # per-user budgets are exercised.
        in_tok = max(1, len((request.system_instructions or "") + request.user_content) // 4)
        out_tok = max(1, len(content) // 4)
        return ProviderResponse(
            content=content,
            input_tokens=in_tok,
            output_tokens=out_tok,
            provider=self.name,
            model=request.model,
        )

    # -- internals ---------------------------------------------------------

    def _seed(self, request: ProviderRequest) -> int:
        material = f"{request.system_instructions or ''}|{request.user_content}|{request.model}"
        digest = hashlib.sha256(material.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    def _text(self, request: ProviderRequest) -> str:
        seed = self._seed(request)
        return (
            f"[mock:{request.model}] deterministic response #{seed:08x} "
            f"for {len(request.user_content)} chars of input."
        )

    def _synthesize(self, schema: dict[str, Any]) -> dict[str, Any]:
        """Build a value that validates against `schema`."""
        return self._value_for(schema, self._seed_text())

    def _seed_text(self) -> str:
        return "mock"

    def _value_for(self, schema: dict[str, Any], token: str) -> Any:
        t = hashlib.sha256(token.encode()).hexdigest()[:12]

        # Union of anyOf: emit the first subschema.
        if "anyOf" in schema:
            return self._value_for(schema["anyOf"][0], token)
        if "oneOf" in schema:
            return self._value_for(schema["oneOf"][0], token)

        declared = schema.get("type")
        if isinstance(declared, list):
            declared = declared[0] if declared else "string"

        if declared == "object":
            out: dict[str, Any] = {}
            for key, sub in (schema.get("properties") or {}).items():
                out[key] = self._value_for(sub, f"{token}:{key}")
            return out

        if declared == "array":
            item = schema.get("items") or {"type": "string"}
            count = 3
            return [self._value_for(item, f"{token}[{i}]") for i in range(count)]

        if declared == "integer":
            return int(t[:4], 16) % 100
        if declared == "number":
            return round((int(t[:4], 16) % 1000) / 1000.0, 3)
        if declared == "boolean":
            return bool(int(t[:2], 16) % 2)
        if declared == "null":
            return None

        # string
        enum = schema.get("enum")
        if enum:
            return enum[0]
        desc = str(schema.get("description") or "")
        fmt = schema.get("format")
        if fmt == "uuid":
            return f"{t[:8]}-{t[8:12]}-{t[8:12]}-{t[:4]}-{t[:12]}"
        return f"{token}_{t[:8]}" + (f" ({desc})" if desc else "")


class ScriptedLLMProvider(ProviderAdapter):
    """Returns a pre-programmed sequence of responses.

    Used by tests to exercise retry, fallback, timeout and repair paths without
    a network. The final response repeats once the script is exhausted.
    """

    name = "scripted"

    def __init__(self, script: list[str] | None = None,
                 error_at: int | None = None,
                 api_key: str | None = None) -> None:
        super().__init__(api_key)
        self.script = list(script or [])
        # Index at which `complete` should raise a simulated provider error.
        self.error_at = error_at
        self.calls = 0

    @property
    def is_configured(self) -> bool:
        return True

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        idx = self.calls
        self.calls += 1
        if self.error_at is not None and idx == self.error_at:
            raise AITimeoutError("scripted timeout")
        if not self.script:
            content = "{}"
        else:
            content = self.script[min(idx, len(self.script) - 1)]
        return ProviderResponse(
            content=content,
            input_tokens=len(request.user_content.split()),
            output_tokens=len(content.split()),
            provider=self.name,
            model=request.model,
        )