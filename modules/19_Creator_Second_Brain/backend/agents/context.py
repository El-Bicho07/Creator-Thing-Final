"""Per-run context injected into every tool. The LLM never chooses the channel — the app does."""

import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


class Evidence:
    """Numbered registry of everything the agent has been shown, so its citations map back to real rows.

    Tools register excerpts / stances here and show the model the number; the final answer cites those
    numbers and the caller resolves them — the model can't invent a source that was never retrieved.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._items: dict[int, dict] = {}
        self._keys: dict[tuple, int] = {}

    def add(self, key: tuple, item: dict) -> int:
        with self._lock:
            if key in self._keys:
                return self._keys[key]
            n = len(self._items) + 1
            self._items[n] = {"n": n, **item}
            self._keys[key] = n
            return n

    def get(self, n: int) -> dict | None:
        return self._items.get(n)

    def all(self) -> list[dict]:
        return list(self._items.values())


@dataclass
class AgentContext:
    channel_id: str
    evidence: Evidence = field(default_factory=Evidence)
    # progress callback: emit({"type": "step", ...}) — wired to the SSE stream in chat, no-op elsewhere
    emit: Callable[[dict], None] = lambda event: None
    agent: str = ""
    # scratch space for tools that produce a validated artefact (e.g. the Clip Editor's last good sequence)
    scratch: dict[str, Any] = field(default_factory=dict)

    def child(self, agent: str, emit: Callable[[dict], None] | None = None) -> "AgentContext":
        """Fresh context (own evidence numbering) for a specialist called by the supervisor."""
        return AgentContext(self.channel_id, emit=emit or self.emit, agent=agent)

    def step(self, tool: str, detail: str = "") -> None:
        self.emit({"type": "step", "agent": self.agent, "tool": tool, "detail": detail[:200]})
