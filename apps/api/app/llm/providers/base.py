"""Provider abstraction for the LLM Gateway.

`ProviderAdapter` is the only place provider-specific knowledge may live.
Adapters MUST NOT raise provider SDK exceptions -- they normalise everything
into `ProviderResponse` or a platform error from `app.core.errors`.
"""
from __future__ import annotations

import abc

from app.llm.contracts import ProviderRequest, ProviderResponse


class ProviderAdapter(abc.ABC):
    """Base class for all LLM providers."""

    #: Stable provider key used in routing and cost tables.
    name: str = "base"

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key

    @property
    def is_configured(self) -> bool:
        """True when this adapter can actually execute a request."""
        return True

    @abc.abstractmethod
    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        """Execute a completion. Raises AIProviderError / AITimeoutError /
        AIRateLimitError on failure -- never a raw provider exception.

        Async by contract: the gateway applies the per-call timeout around this
        coroutine. Adapters may do blocking I/O, but must not call
        ``asyncio.run()`` (that is illegal inside a running event loop).
        """

    def describe(self) -> dict:
        return {"provider": self.name, "configured": self.is_configured}