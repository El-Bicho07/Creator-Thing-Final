"""Architectural contract tests.

These enforce the boundary in task §14 and the "FINAL PRINCIPLE":

    Feature modules must NOT know that E5-base is in use.
    Only the EmbeddingService may know.

They are static source checks, so they fail loudly if someone later imports
`sentence_transformers` in a feature module or hard-codes a model name.
"""
import ast
import os
import pathlib

import pytest

APP_ROOT = pathlib.Path(__file__).resolve().parents[2] / "app"

#: Directories that are *allowed* to know embedding internals.
EMBEDDING_OWNER_PREFIXES = ("ai/embedding",)

#: Model names that must never be referenced outside the embedding package.
FORBIDDEN_MODEL_TOKENS = (
    "bge-m3",
    "tamil-embed-base",
    "MiniLM",
    "mpnet",
    "bge-small",
    "e5-small",
)


def python_files() -> list[pathlib.Path]:
    return sorted(APP_ROOT.rglob("*.py"))


def relative(path: pathlib.Path) -> str:
    return str(path.relative_to(APP_ROOT)).replace(os.sep, "/")


def is_embedding_owner(path: pathlib.Path) -> bool:
    rel = relative(path)
    return any(rel.startswith(prefix) for prefix in EMBEDDING_OWNER_PREFIXES)


# --------------------------------------------------------------------------- #
# No feature module may import the embedding framework directly
# --------------------------------------------------------------------------- #

def test_no_feature_module_imports_sentence_transformers():
    offenders = []
    for path in python_files():
        if is_embedding_owner(path):
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            for name in names:
                if name.split(".")[0] in ("sentence_transformers", "torch", "fastembed"):
                    offenders.append(f"{relative(path)} imports {name}")
    assert not offenders, "Feature modules must not import the embedding stack:\n" + \
        "\n".join(offenders)


def test_only_embedding_package_imports_embedding_framework():
    """AST-based, so the *prohibition text* in docstrings is not mistaken for usage.

    The Memory and Voice modules legitimately say in their docstrings that they
    must never import `sentence_transformers`; a naive substring scan would flag
    those warnings as violations.
    """
    offenders = []
    for path in python_files():
        if is_embedding_owner(path):
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            else:
                continue
            for name in names:
                if name.split(".")[0] in ("sentence_transformers", "fastembed"):
                    offenders.append(f"{relative(path)} imports {name}")
    assert not offenders, \
        "sentence_transformers/fastembed may only be imported by app/ai/embedding/:\n" \
        + "\n".join(offenders)


# --------------------------------------------------------------------------- #
# No feature module may hard-code a model name
# --------------------------------------------------------------------------- #

def test_no_hardcoded_model_names_outside_embedding_package():
    offenders = []
    for path in python_files():
        if is_embedding_owner(path):
            continue
        source = path.read_text(encoding="utf-8")
        for token in FORBIDDEN_MODEL_TOKENS:
            if token in source:
                offenders.append(f"{relative(path)} mentions {token!r}")
    assert not offenders, \
        "Model names must come from settings, not be hard-coded:\n" + "\n".join(offenders)


def test_removed_models_absent_from_entire_app():
    """bge-m3 and tamil-embed must not appear anywhere in production code."""
    for path in python_files():
        source = path.read_text(encoding="utf-8").lower()
        for token in ("bge-m3", "tamil-embed-base"):
            if token in source:
                pytest.fail(f"{relative(path)} references removed model {token!r}")


# --------------------------------------------------------------------------- #
# Single LLM gateway: no direct provider SDK usage
# --------------------------------------------------------------------------- #

def test_no_feature_module_imports_provider_sdks():
    """Feature code must route every LLM call through the gateway (ADR-003)."""
    offenders = []
    for path in python_files():
        rel = relative(path)
        if rel.startswith("llm/"):
            continue  # provider adapters legitimately own the SDKs
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            for name in names:
                if name.split(".")[0] in (
                    "google", "anthropic", "groq", "openai"
                ):
                    offenders.append(f"{rel} imports {name}")
    assert not offenders, \
        "Direct provider SDK usage is forbidden outside app/llm/:\n" + "\n".join(offenders)


def test_memory_and_voice_depend_on_embedding_abstraction():
    """Memory and Voice must reach embeddings via EmbeddingService."""
    for rel in ("memory/retrieval.py", "voice/engine.py"):
        path = APP_ROOT / rel
        source = path.read_text(encoding="utf-8")
        assert "from app.ai.embedding import" in source, \
            f"{rel} must import the embedding abstraction"
        assert "EmbeddingService" in source, f"{rel} must type-hint EmbeddingService"


def test_only_one_vector_store():
    """The platform must have exactly one vector persistence path."""
    offenders = []
    for path in python_files():
        rel = relative(path)
        if rel in ("memory/retrieval.py", "memory/reembed.py", "ai/embedding/e5.py"):
            continue
        source = path.read_text(encoding="utf-8")
        if "<=>" in source or "cosine_distance" in source:
            offenders.append(rel)
    assert not offenders, \
        f"Only the memory engine may issue pgvector similarity queries: {offenders}"


def test_no_transliteration_pipeline_in_production():
    """Phase 2 must not ship a transliteration/normalisation layer.

    The Phase 1 evaluation found normalisation causes large, statistically
    significant same-script regressions, so it must not reach production code.
    """
    offenders = []
    for path in python_files():
        source = path.read_text(encoding="utf-8").lower()
        for token in ("indic_transliteration", "indic-transliteration",
                      "aksharamukha", "fastembed", "sanscript"):
            if token in source:
                offenders.append(f"{relative(path)} references {token!r}")
    assert not offenders, \
        "No transliteration pipeline in Phase 2 production code:\n" + "\n".join(offenders)


def test_e5_prefixes_never_stripped():
    """No code path may bypass the mandatory query:/passage: prefixes."""
    for rel in ("memory/retrieval.py", "voice/engine.py"):
        source = (APP_ROOT / rel).read_text(encoding="utf-8")
        assert "embed_query" in source or "embed_document" in source or \
               "EmbeddingService" in source
        # A direct .encode( call would bypass the prefixes.
        assert ".encode(" not in source, \
            f"{rel} calls .encode() directly, bypassing the E5 prefixes"