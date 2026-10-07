"""The Studio frontend contract must not drift from the API.

`apps/web/lib/studio-contracts.ts` is generated from the live OpenAPI spec by
`scripts/generate_studio_contracts.py`. Nothing enforces that here: a developer can
change a Pydantic model, regenerate nothing, and the TypeScript keeps compiling
while describing an API that no longer exists (task §27).

These tests generate the contract from the running application and compare it with
the committed file, so drift fails the suite instead of surfacing at runtime.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

import pytest

# The API container mounts the repository as /app, with read-only mounts at
# /scripts and /web-lib. Resolve those first, then fall back to walking up from
# this file for a full checkout (running pytest on the host).
def _repo_root() -> pathlib.Path:
    candidates = [
        pathlib.Path("/app"),                                  # container
        pathlib.Path(__file__).resolve().parents[4],           # host checkout
    ]
    for base in candidates:
        if (base / "apps" / "api" / "app" / "main.py").is_file() or (base / "app" / "main.py").is_file():
            return base
    return candidates[0]


REPO_ROOT = _repo_root()


def _resolve(relative: str) -> pathlib.Path | None:
    """Find a repo file, accepting either a full checkout or the mounts."""
    direct = REPO_ROOT / relative
    if direct.is_file():
        return direct
    # Container layout: scripts/ and the web lib are mounted at the root.
    for prefix in ("scripts", "web-lib"):
        mapped = pathlib.Path("/") / prefix / pathlib.Path(relative).name
        if mapped.is_file():
            return mapped
    return None


GENERATOR = _resolve("scripts/generate_studio_contracts.py")
COMMITTED = _resolve("apps/web/lib/studio-contracts.ts")


def _load_generator():
    spec = importlib.util.spec_from_file_location(
        "generate_studio_contracts", GENERATOR
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_repo_files_are_reachable():
    """The drift guard needs the generator and the committed contract.

    They are mounted read-only into the API container; on a bare checkout they sit
    next to the tests. A hard failure here is deliberate: a drift guard that cannot
    see its inputs must not report success.
    """
    assert GENERATOR is not None and GENERATOR.is_file(), (
        "scripts/generate_studio_contracts.py is not reachable "
        f"(looked under {REPO_ROOT})"
    )
    assert COMMITTED is not None and COMMITTED.is_file(), (
        "apps/web/lib/studio-contracts.ts is not reachable "
        f"(looked under {REPO_ROOT})"
    )


def test_generated_contract_is_current():
    """The committed TypeScript must equal freshly generated output."""
    generator = _load_generator()
    generated = generator.generate()

    with open(COMMITTED, encoding="utf-8") as fh:
        committed = fh.read()

    if generated != committed:
        import difflib

        diff = difflib.unified_diff(
            committed.splitlines(),
            generated.splitlines(),
            fromfile="committed studio-contracts.ts",
            tofile="regenerated",
            lineterm="",
            n=1,
        )
        pytest.fail(
            "apps/web/lib/studio-contracts.ts is stale. Regenerate with "
            "scripts/generate_studio_contracts.py.\n"
            + "\n".join(list(diff)[:60])
        )


def test_contract_declares_the_studio_schemas():
    generator = _load_generator()
    generated = generator.generate()
    for name in (
        "SessionResponse",
        "GenerationRequest",
        "GenerationResponse",
        "CritiqueResponse",
        "RefineRequest",
        "CapabilityInfo",
        "VersionInfo",
    ):
        assert f"export interface {name} {{" in generated, name


def test_contract_declares_no_user_id_field():
    """A `user_id` field in the client contract would imply the client sends ownership.

    Checks FIELD DECLARATIONS, not the raw text: the generated header deliberately
    explains in prose that no owner id is sent.
    """
    import re

    with open(COMMITTED, encoding="utf-8") as fh:
        content = fh.read()
    declarations = re.findall(r"^\s{2}([A-Za-z0-9_]+)\??:", content, re.MULTILINE)
    assert "user_id" not in declarations, (
        "the Studio contract exposes a user_id field; the API must derive "
        "ownership from the JWT and enforce it with RLS"
    )


def test_contract_renders_enums_as_literal_unions():
    generator = _load_generator()
    generated = generator.generate()
    assert 'export type CritiqueSeverity = "strong" | "medium" | "light";' in generated
    assert 'export type SessionStep = "context" | "generate" | "review" | "refine" | "done";' \
        in generated


def test_contract_does_not_emit_phase2_enums():
    """Only Studio-referenced enums belong in the Studio contract."""
    with open(COMMITTED, encoding="utf-8") as fh:
        content = fh.read()
    assert "MemoryCategory" not in content
    assert "SourceType" not in content


def test_every_studio_path_is_documented():
    generator = _load_generator()
    generated = generator.generate()
    for route in (
        "GET /api/studio/sessions",
        "POST /api/studio/generate",
        "POST /api/studio/critique",
        "POST /api/studio/refine",
        "GET /api/studio/capabilities",
        "DELETE /api/studio/sessions/{session_id}",
    ):
        assert route in generated, f"{route} missing from the generated contract"
