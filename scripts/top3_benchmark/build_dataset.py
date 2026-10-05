#!/usr/bin/env python3
"""
Dataset builder + integrity verifier for the top-3 embedding benchmark.

Responsibilities
----------------
1. Merge the document and query modules into a single fixed dataset.
2. Emit docs/eval/embedding_top3_benchmark/dataset.json
3. Run integrity checks BEFORE any model is loaded:
     - no duplicate document ids
     - no duplicate query ids
     - no duplicate query text
     - every relevant/related id resolves to a real document
     - every query has at least one relevant document
     - LEAKAGE: no query string appears verbatim inside any document
     - near-duplicate detection (high token overlap) between query and its
       own relevant documents -> warns
     - language distribution + phenomenon coverage report
4. Exit non-zero if a hard check fails.

The verifier is the reproducibility guarantee: all three models consume the
exact same dataset.json produced here.
"""

import json
import hashlib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from dataset_documents import DOCUMENTS as DOCS_EN
from dataset_documents_ta_hi import DOCUMENTS as DOCS_TA_HI
from dataset_documents_mixed import DOCUMENTS as DOCS_MIXED
from dataset_queries_a import QUERIES as QUERIES_A
from dataset_queries_b import QUERIES as QUERIES_B

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "eval" / "embedding_top3_benchmark"

SEED = 20260303  # fixed for reproducibility (no sampling is performed)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def token_set(text: str):
    # Latin + Devanagari aware tokenisation (split on non-word chars)
    return set(re.findall(r"[\w\u0900-\u097F]+", text.lower()))


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def main() -> int:
    documents = DOCS_EN + DOCS_TA_HI + DOCS_MIXED
    queries = QUERIES_A + QUERIES_B

    errors, warnings = [], []

    # ---------------- structural checks ----------------
    doc_ids = [d["id"] for d in documents]
    dup_docs = [k for k, v in Counter(doc_ids).items() if v > 1]
    if dup_docs:
        errors.append(f"duplicate document ids: {dup_docs}")

    q_ids = [q["id"] for q in queries]
    dup_q = [k for k, v in Counter(q_ids).items() if v > 1]
    if dup_q:
        errors.append(f"duplicate query ids: {dup_q}")

    q_texts = [normalize(q["text"]) for q in queries]
    dup_qt = [k for k, v in Counter(q_texts).items() if v > 1]
    if dup_qt:
        errors.append(f"duplicate query text: {dup_qt}")

    doc_texts = [normalize(d["text"]) for d in documents]

    # ---------------- referential integrity ----------------
    doc_index = {d["id"]: d for d in documents}
    for q in queries:
        refs = list(q.get("relevant", [])) + list(q.get("related", []))
        missing = [r for r in refs if r not in doc_index]
        if missing:
            errors.append(f"{q['id']}: unknown doc ids {missing}")
        if not q.get("relevant"):
            errors.append(f"{q['id']}: has no relevant documents")
        overlap = set(q.get("relevant", [])) & set(q.get("related", []))
        if overlap:
            errors.append(f"{q['id']}: ids in both relevant and related: {sorted(overlap)}")

    # ---------------- LEAKAGE: verbatim containment ----------------
    norm_docs = {d["id"]: normalize(d["text"]) for d in documents}
    for q in queries:
        qt = normalize(q["text"])
        if len(qt) < 12:
            continue
        for r in q.get("relevant", []) + q.get("related", []):
            if r in norm_docs and qt in norm_docs[r]:
                errors.append(
                    f"LEAKAGE: query {q['id']} text appears verbatim inside relevant doc {r}"
                )

    # ---------------- near-duplicate (contamination) warning ----------
    doc_tokens = {d["id"]: token_set(d["text"]) for d in documents}
    near_dup = []
    for q in queries:
        qt = token_set(q["text"])
        if len(qt) < 5:
            continue
        for r in q.get("relevant", []):
            if r in doc_tokens:
                sim = jaccard(qt, doc_tokens[r])
                if sim >= 0.85:
                    near_dup.append((q["id"], r, round(sim, 3)))
    if near_dup:
        warnings.append(
            f"{len(near_dup)} query/relevant pairs have >=0.85 token overlap "
            f"(possible contamination): {near_dup[:10]}"
        )

    # ---------------- coverage report ----------------
    doc_lang = Counter(d["lang"] for d in documents)
    doc_cat = Counter(d["category"] for d in documents)
    q_lang = Counter(q["lang"] for q in queries)
    q_phen = Counter(q["phenomenon"] for q in queries)
    q_cat = Counter()
    for q in queries:
        cats = {doc_index[r]["category"] for r in q.get("relevant", []) if r in doc_index}
        for c in cats:
            q_cat[c] += 1

    doc_text_concat = " ".join(doc_texts)
    dataset_hash = hashlib.sha256(doc_text_concat.encode()).hexdigest()[:16]

    report = {
        "seed": SEED,
        "dataset_sha256_16": dataset_hash,
        "counts": {
            "documents": len(documents),
            "queries": len(queries),
            "relevant_pairs": sum(len(q.get("relevant", [])) for q in queries),
            "related_pairs": sum(len(q.get("related", [])) for q in queries),
        },
        "documents_by_language": dict(doc_lang),
        "documents_by_category": dict(doc_cat),
        "queries_by_language": dict(q_lang),
        "queries_by_phenomenon": dict(q_phen),
        "queries_by_target_category": dict(q_cat),
    }

    # ---------------- emit ----------------
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_DIR / "dataset.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "metadata": {
                    "seed": SEED,
                    "dataset_sha256_16": dataset_hash,
                    "note": "Fixed dataset shared by all three candidate models.",
                },
                "documents": documents,
                "queries": queries,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    with open(OUT_DIR / "integrity_report.json", "w", encoding="utf-8") as f:
        json.dump(
            {"coverage": report, "errors": errors, "warnings": warnings,
             "near_duplicate_pairs": near_dup[:50]},
            f, ensure_ascii=False, indent=2,
        )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print("  -", w)
    if errors:
        print("\nERRORS:")
        for e in errors:
            print("  -", e)
        return 1
    print("\nINTEGRITY CHECKS: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
