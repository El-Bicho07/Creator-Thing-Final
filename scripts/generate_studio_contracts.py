#!/usr/bin/env python3
"""Generate TypeScript types for the Studio API from the live OpenAPI spec.

Studio's frontend contract is GENERATED, not hand-written (task §27). The Studio
capability surface is large and shaped by Pydantic models, so duplicating it by
hand in TypeScript guarantees drift: the runtime would accept a payload the
backend rejects, or render a field that no longer exists.

Usage::

    # Regenerate from the running API
    docker exec creator-api python scripts/generate_studio_contracts.py \
        --out /tmp/studio_contracts.ts
    docker cp creator-api:/tmp/studio_contracts.ts apps/web/lib/studio-contracts.ts

    # Verify the committed file is current (CI-friendly, no write)
    docker exec creator-api python scripts/generate_studio_contracts.py \
        --check apps/web/lib/studio-contracts.ts

Why this exists rather than a generic OpenAPI-to-TS tool: the platform has no
Node codegen step, and the Studio surface is a known, bounded set of Pydantic
models. A 200-line generator over those models is smaller and more reviewable than
introducing a build-time dependency, and it keeps the generated file readable.

The pre-existing `packages/contracts/index.ts` is NOT touched: it covers Phase 1/2
models that predate this generator, and rewriting it is out of Phase 3 scope. Its
header already claims to be auto-generated, which is inaccurate -- see
docs/PHASE_3_FINAL_REPORT.md §20.
"""
from __future__ import annotations

import argparse
import difflib
import os
import re
import sys
from typing import Any, Dict, List

HEADER = """// Studio + Today/Producer API types — AUTO-GENERATED, DO NOT EDIT BY HAND.
//
// Source: FastAPI OpenAPI spec (`/openapi.json`), Studio (Phase 3) and
// Today/Producer (Phase 4) schemas.
// Regenerate: scripts/generate_studio_contracts.py
//
// Ownership note: none of these types carry a `user_id`. The API derives the
// creator from the Supabase JWT and enforces ownership with PostgreSQL RLS, so a
// client cannot supply (or be trusted with) an owner id.

"""


def _ts_type(schema: Dict[str, Any], *, enums: Dict[str, Any] | None = None) -> str:
    """Map a JSON-schema fragment to a TypeScript type expression.

    `enums` maps an enum schema name to its member values, so a `$ref` to an enum
    becomes a string-literal union rather than an opaque object.
    """
    if not schema:
        return "unknown"

    if "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        if enums and name in enums:
            members = enums[name]
            if enums.get(f"{name}__type") == "string":
                return " | ".join(_literal(v) for v in members)
        return name

    if "anyOf" in schema or "oneOf" in schema:
        options = schema.get("anyOf") or schema.get("oneOf") or []
        rendered: List[str] = []
        for option in options:
            rendered.append(_ts_type(option, enums=enums))
        # Drop the common `null` union member and make it optional instead.
        non_null = [r for r in rendered if r != "null"]
        nullable = len(non_null) != len(rendered)
        joined = " | ".join(dict.fromkeys(non_null)) or "unknown"
        return f"{joined} | null" if nullable else joined

    if "allOf" in schema:
        parts = [_ts_type(s, enums=enums) for s in schema["allOf"]]
        return " & ".join(p for p in parts if p and p != "{}")

    for key in ("const",):
        if key in schema:
            return _literal(schema[key])

    if "enum" in schema:
        return " | ".join(_literal(v) for v in schema["enum"])

    kind = schema.get("type")
    if isinstance(kind, list):
        return " | ".join(
            _ts_type({**schema, "type": k}, enums=enums) for k in kind
        )

    if kind == "string":
        if schema.get("format") in ("uuid", "date-time"):
            return "string"
        return "string"
    if kind in ("integer", "number"):
        return "number"
    if kind == "boolean":
        return "boolean"
    if kind == "null":
        return "null"
    if kind == "array":
        return f"{_ts_type(schema.get('items') or {}, enums=enums)}[]"
    if kind == "object":
        props = schema.get("properties")
        if props:
            # An inline object: keep the structural type readable.
            fields = ", ".join(
                f"{_property_name(k)}: {_ts_type(v, enums=enums)}"
                for k, v in props.items()
            )
            return f"{{ {fields} }}"
        additional = schema.get("additionalProperties")
        if isinstance(additional, dict):
            return f"Record<string, {_ts_type(additional, enums=enums)}>"
        return "Record<string, unknown>"
    return "unknown"


def _literal(value: Any) -> str:
    if isinstance(value, str):
        return f'"{value}"'
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(value)
    if value is None:
        return "null"
    return "unknown"


_IDENTIFIER = re.compile(r"[^A-Za-z0-9_]")


def _property_name(name: str) -> str:
    if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
        return name
    return _IDENTIFIER.sub("_", name)


def _fields_with_defaults() -> Dict[str, set[str]]:
    """Model name -> field names that carry a default.

    OpenAPI does not record Pydantic defaults here (FastAPI emits the property
    without a `default`), so `required` alone cannot distinguish "always
    serialised because it has a default" from "genuinely optional".

    A field with a default is ALWAYS present in a response, so it must not become
    `field?: T` in TypeScript -- that would force every consumer to write
    `?? []` for something the API always sends. Fields whose default is `None`
    are genuinely nullable and stay optional.
    """
    import importlib

    from app.producer import contracts as producer_contracts
    from app.studio.api import schemas as studio_schemas

    sources = [studio_schemas, producer_contracts]
    out: Dict[str, set[str]] = {}
    for source in sources:
        out.update(_defaults_from(source))
    return out


def _defaults_from(module) -> Dict[str, set[str]]:
    """Field names carrying a default, per Pydantic model in `module`."""
    out: Dict[str, set[str]] = {}
    for attr in dir(module):
        model = getattr(module, attr)
        fields = getattr(model, "model_fields", None)
        if not isinstance(fields, dict):
            continue
        defaulted = set()
        for field_name, info in fields.items():
            if info.is_required():
                continue
            default = info.default
            factory = getattr(info, "default_factory", None)
            if default is None and factory is None:
                continue  # explicitly optional/nullable
            defaulted.add(field_name)
        out[model.__name__] = defaulted
    return out


def _emit_interface(name: str, schema: Dict[str, Any],
                    enums: Dict[str, Any] | None = None,
                    defaulted: set[str] | None = None) -> str:
    lines: List[str] = []
    description = (schema.get("description") or "").strip().splitlines()
    if description:
        lines.append(f"/** {description[0]} */")

    required = set(schema.get("required") or [])
    props = schema.get("properties") or {}

    lines.append(f"export interface {name} {{")

    if not props:
        lines.append("  [key: string]: unknown;")
        lines.append("}")
        return "\n".join(lines)

    for key, value in props.items():
        rendered = _ts_type(value, enums=enums)
        has_default = bool(defaulted and key in defaulted)
        optional = "" if (key in required or has_default) else "?"
        # A property whose type already includes `null` must not also be optional:
        # `a?: T | null` lets a caller omit it, which some fields cannot.
        if optional and rendered.endswith("| null"):
            optional = ""
        lines.append(f"  {_property_name(key)}{optional}: {rendered};")

    lines.append("}")
    return "\n".join(lines)


def generate(prefix: str = "Studio") -> str:
    """Return the TypeScript contract source for Studio + Phase 4 schemas."""
    from app.main import app

    spec = app.openapi()
    schemas: Dict[str, Any] = spec["components"]["schemas"]

    # Studio response/request models, plus the enums Studio exposes.
    wanted = sorted(
        name for name, body in schemas.items()
        if name in {
            "SessionCreateRequest", "SessionUpdateRequest", "SessionResponse",
            "SessionListResponse", "GenerationRequest", "GenerationResponse",
            "CritiqueRequest", "CritiqueItem", "CritiqueResponse", "CritiqueSeverity",
            "RefineRequest", "RefinementModifier", "CapabilityInfo",
            "CapabilityListResponse", "VersionInfo", "VersionListResponse",
            "ApprovalRequest", "ContextPreviewResponse", "SessionStatus",
            "SessionStep",
            # --- Phase 4: Today + AI Creative Producer ---
            "ProducerRecommendation", "Evidence", "ProducerContextSummary",
            "ProducerRun", "TodayPlan", "TodayItem", "EvidenceKind",
            "ClaimKind", "RecommendationKind", "ActionKind", "Priority",
            "TodayItemStatus",
            "TodayPlanResponse", "PlanResultResponse", "RecommendResponse",
            "ExecuteResponse", "CarryoverItem", "CarryoverResponse",
            # --- Phase 5: Growth + Analytics Copilot ---
            "MetricValue", "EvidenceItem", "ConfidenceResponse", "InsightResponse",
            "OpportunityResponse", "CommentResponse", "CommentInsightResponse",
            "PerformanceRecordResponse", "TrendResponse", "RankingEntry",
            "GrowthOverviewResponse", "CopilotCitation", "CopilotResponse",
            "CopilotRequest", "LessonResponse", "LessonEvaluationResponse",
            "ExperimentResponse", "ExperimentCreateRequest",
            "AnalyzeCommentsRequest", "AnalyzeCommentsResponse",
            "AddCommentRequest", "AddCommentResponse",
            "CreatePerformanceRequest", "CreateOpportunityRequest",
            "CreateCommentInsightResponse",
            "InsightType", "ImpactLevel", "ConfidenceBand", "CommentCategory",
            "CommentIntent", "OpportunityOrigin", "ExperimentStatus",
            "ExperimentVerdict",
        }
    )

    # Index enums so `$ref`s to them render as literal unions. FastAPI models an
    # enum as its own schema; emitting that schema as an interface would be wrong.
    enums: Dict[str, Any] = {}
    for name, body in schemas.items():
        if isinstance(body.get("enum"), list):
            enums[name] = body["enum"]
            enums[f"{name}__type"] = body.get("type", "string")

    defaulted = _fields_with_defaults()

    chunks: List[str] = [HEADER]
    chunks.append("// --------------------------------------------------------------------")
    chunks.append("// Phase 3 Studio + Phase 4 Today/Producer contracts")
    chunks.append("//")
    chunks.append("// Capability inputs are validated against a Pydantic model, so these are")
    chunks.append("// exactly the shapes the API will accept. Sending an unknown field is a 422.")
    chunks.append("// --------------------------------------------------------------------")

    emitted = set()
    for name in wanted:
        schema = schemas[name]
        if name in emitted or name in enums:
            continue
        chunks.append(
            _emit_interface(
                name, schema, enums=enums, defaulted=defaulted.get(name, set())
            )
        )
        chunks.append("")
        emitted.add(name)

    # Only emit enums the Studio schemas actually reference, so Phase 2 enums
    # (e.g. MemoryCategory) do not leak into the Studio contract.
    referenced: set = set()
    for name in wanted:
        stack = [schemas.get(name) or {}]
        while stack:
            node = stack.pop()
            if not isinstance(node, dict):
                continue
            ref = node.get("$ref")
            if ref:
                referenced.add(ref.split("/")[-1])
            stack.extend(v for v in node.values() if isinstance(v, (dict, list)))
            for v in (node.get("anyOf") or []) + (node.get("oneOf") or []) \
                    + (node.get("allOf") or []):
                if isinstance(v, dict):
                    stack.append(v)
            if isinstance(node.get("properties"), dict):
                stack.extend(node["properties"].values())
            if isinstance(node.get("items"), dict):
                stack.append(node["items"])

    studio_enums = {
        n: enums[n] for n in referenced
        if n in enums and not n.endswith("__type")
    }
    if studio_enums:
        chunks.append("// --------------------------------------------------------------------")
        chunks.append("// Enumerations")
        chunks.append("// --------------------------------------------------------------------")
        for name in sorted(studio_enums):
            members = " | ".join(_literal(v) for v in studio_enums[name])
            chunks.append(f"export type {name} = {members};")
        chunks.append("")

    # Operation paths, so the client surface is documented in one place.
    chunks.append("// --------------------------------------------------------------------")
    chunks.append("// Operations")
    chunks.append("// --------------------------------------------------------------------")
    for path, methods in sorted(spec["paths"].items()):
        if not (path.startswith("/api/studio") or path.startswith("/api/today")
                or path.startswith("/api/producer")):
            continue
        for method, operation in sorted(methods.items()):
            if method not in ("get", "post", "patch", "delete", "put"):
                continue
            summary = (operation.get("summary") or "").strip()
            route = f"{method.upper()} {path}"
            chunks.append(f"// {route} — {summary}" if summary else f"// {route}")
    chunks.append("")

    return "\n".join(chunks).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=None, help="write to this path")
    parser.add_argument(
        "--check",
        default=None,
        help="compare the given file against freshly generated output; "
             "exit 1 if they differ",
    )
    args = parser.parse_args()

    generated = generate()

    if args.check:
        if not os.path.isfile(args.check):
            print(f"missing: {args.check}", file=sys.stderr)
            return 1
        with open(args.check, encoding="utf-8") as fh:
            current = fh.read()
        if current == generated:
            print(f"up to date: {args.check}")
            return 0
        diff = difflib.unified_diff(
            current.splitlines(), generated.splitlines(),
            fromfile=f"{args.check} (committed)", tofile="studio contracts (generated)",
            lineterm="", n=2,
        )
        print("\n".join(diff), file=sys.stderr)
        return 1

    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(generated)
        print(f"wrote {args.out}")
        return 0

    sys.stdout.write(generated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
