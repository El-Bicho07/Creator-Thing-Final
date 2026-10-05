"""Studio (Phase 3) — the unified creator workspace.

Studio is one workspace built on shared platform services. It owns orchestration,
context assembly, capability dispatch, session state and version history. It does
**not** own a model, an embedding, a vector store, a memory system, a voice system,
an auth path or a job queue — those all belong to Phase 2 and are reused here.

Layering, outermost first:

```text
app/features/studio/router.py   HTTP surface, Pydantic bodies, RLS-scoped session
app/studio/orchestrator.py      the only orchestration authority
app/studio/registry.py          capability contract + registry + Gateway call site
app/studio/capabilities/        capability implementations and validation
app/studio/context.py           ContextAssembler -> Memory + Voice (Phase 2)
app/studio/persistence.py       sessions, versions, content_assets reuse
app/studio/domain/rules.py      pure deterministic rules (timing, platforms, goals)
app/studio/safety.py            prompt-injection boundary for untrusted text
```
"""
from __future__ import annotations

from app.studio.capabilities.implementations import (
    ALL_CAPABILITIES,
    HookInput,
    IdeaInput,
    RefineInput,
    ScriptInput,
    build_registry,
)
from app.studio.context import ContextAssembler, CreatorContext, get_context_assembler
from app.studio.domain import rules
from app.studio.orchestrator import (
    ExecutionResult,
    StageTrace,
    StudioOrchestrator,
    WORKFLOW_STEPS,
)
from app.studio.persistence import (
    StudioGenerationRecord,
    StudioRepository,
    StudioSessionRecord,
)
from app.studio.registry import (
    CapabilityContext,
    CapabilityError,
    CapabilityOutcome,
    StudioCapability,
    StudioCapabilityRegistry,
)
from app.studio.safety import neutralize, wrap

__all__ = [
    "StudioOrchestrator",
    "ExecutionResult",
    "StageTrace",
    "WORKFLOW_STEPS",
    "ContextAssembler",
    "CreatorContext",
    "get_context_assembler",
    "StudioCapability",
    "StudioCapabilityRegistry",
    "CapabilityContext",
    "CapabilityOutcome",
    "CapabilityError",
    "StudioRepository",
    "StudioSessionRecord",
    "StudioGenerationRecord",
    "build_registry",
    "ALL_CAPABILITIES",
    "IdeaInput",
    "HookInput",
    "ScriptInput",
    "RefineInput",
    "rules",
    "neutralize",
    "wrap",
]
