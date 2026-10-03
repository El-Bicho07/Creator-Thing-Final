#!/usr/bin/env python3
"""
Normalization / transliteration stage for the follow-up evaluation.

NORMALIZATION TOOL (not an embedding model):
    indic-transliteration 2.3.75  (a.k.a. sanscript schemes; IndicTrans lineage)
    schemes are data files maintained by the Sanscript project

Two strategies are produced so the comparison is not an arbitrary choice:

  A. norm_q_to_script   (Option A: queries only)
       Latin-script query -> its native script (Tamil / Devanagari).
       Requires knowing the query's language: uses the dataset's
       query_language field (ORACLE). See normalization_methodology.md.

  B. norm_both_to_latin (Option B: queries + documents)
       Every item is moved to Latin script: native-script text is romanised,
       Latin text is left untouched.
       Needs only Unicode script detection -- NO language identifier,
       therefore no oracle. This is the production-realistic option.

Run with the isolated venv that has indic-transliteration installed:
    /tmp/followup_norm_venv/bin/python scripts/benchmark_followup/normalize.py

Input  : docs/eval/benchmarks/2026-10-03_embedding_raw/{documents.csv,per_query_results.csv}
Output : docs/eval/benchmarks/benchmark_followup/normalized_inputs.json
"""
import csv
import json
import os
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXPORT = os.path.join(ROOT, "docs/eval/benchmarks/2026-10-03_embedding_raw")
OUTDIR = os.path.join(ROOT, "docs/eval/benchmarks/benchmark_followup")

# Scheme choice, justified by round-trip fidelity measured on this corpus's own
# native-script text plus a colloquial-input probe (see normalization_methodology.md).
SCHEME = {"ta": "optitrans_dravidian", "hi": "iast"}

TARGET_SCRIPT = {"ta": "tamil", "hi": "devanagari"}


def char_block(ch):
    o = ord(ch)
    if 0x0B80 <= o <= 0x0BFF:
        return "Tamil"
    if 0x0900 <= o <= 0x097F:
        return "Devanagari"
    return "Other"


def detect_script(text):
    """Majority non-ASCII-script detector. Latin/digits/punct are ignored."""
    counts = {"Tamil": 0, "Devanagari": 0}
    for ch in text:
        b = char_block(ch)
        if b in counts:
            counts[b] += 1
    total = counts["Tamil"] + counts["Devanagari"]
    if total == 0:
        return "Latin"
    if counts["Tamil"] >= counts["Devanagari"]:
        return "Tamil"
    return "Devanagari"


def native_lang_for(script):
    return {"Tamil": "ta", "Devanagari": "hi"}.get(script)


def romanize(text, native_script):
    """native script -> Latin. Language inferred from the script itself."""
    lang = native_lang_for(native_script)
    if lang is None:
        return text, "no_scheme"
    from indic_transliteration import sanscript as ss
    try:
        return ss.transliterate(text, TARGET_SCRIPT[lang], SCHEME[lang]), "ok"
    except Exception as exc:  # pragma: no cover - defensive
        return text, "error:%s" % type(exc).__name__


def to_script(text, lang):
    """Latin -> native script for a known language."""
    if lang not in TARGET_SCRIPT:
        return text, "skip_no_target"
    from indic_transliteration import sanscript as ss
    try:
        return ss.transliterate(text, SCHEME[lang], TARGET_SCRIPT[lang]), "ok"
    except Exception as exc:  # pragma: no cover - defensive
        return text, "error:%s" % type(exc).__name__


def main():
    try:
        import indic_transliteration  # noqa: F401
    except ImportError:
        sys.exit(
            "FATAL: indic-transliteration not importable.\n"
            "Create the isolated venv first (never install into the API container):\n"
            "  python3 -m venv /tmp/followup_norm_venv\n"
            "  /tmp/followup_norm_venv/bin/pip install indic-transliteration==2.3.75"
        )

    os.makedirs(OUTDIR, exist_ok=True)

    docs = list(csv.DictReader(open(os.path.join(EXPORT, "documents.csv"), encoding="utf-8")))
    qrows = [
        r
        for r in csv.DictReader(open(os.path.join(EXPORT, "per_query_results.csv"), encoding="utf-8"))
        if r["condition"] == "documented_prefixes"
    ]

    stats = {"A": {"transliterated": 0, "unchanged": 0, "skipped": 0, "error": 0},
             "B_doc": {"romanised": 0, "unchanged": 0, "error": 0},
             "B_q": {"romanised": 0, "unchanged": 0, "error": 0}}

    out_docs = {}
    for d in docs:
        script = detect_script(d["text"])
        declared = d["script"]
        if script != declared:
            # script detector disagrees with the dataset label; trust detection
            # and record the disagreement rather than silently picking one.
            stats.setdefault("script_disagreements", []).append(
                {"doc_id": d["doc_id"], "declared": declared, "detected": script}
            )
        b_text, b_status = (d["text"], "unchanged") if script == "Latin" else romanize(d["text"], script)
        if b_status == "ok" and b_text != d["text"]:
            stats["B_doc"]["romanised"] += 1
        elif b_status.startswith("error"):
            stats["B_doc"]["error"] += 1
        else:
            stats["B_doc"]["unchanged"] += 1
        out_docs[d["doc_id"]] = {
            "doc_id": d["doc_id"],
            "raw": d["text"],
            "script_declared": declared,
            "script_detected": script,
            "to_latin": b_text,
            "B_status": b_status,
        }

    out_queries = {}
    for q in qrows:
        script = detect_script(q["query_text"])
        lang = q["query_language"]
        # Strategy A: only Latin-script queries with a known Tamil/Hindi language.
        if script == "Latin" and lang in TARGET_SCRIPT:
            a_text, a_status = to_script(q["query_text"], lang)
        else:
            a_text, a_status = q["query_text"], "unchanged"
        if a_status == "ok" and a_text != q["query_text"]:
            stats["A"]["transliterated"] += 1
        elif a_status.startswith("error"):
            stats["A"]["error"] += 1
        else:
            stats["A"]["unchanged"] += 1
        # Strategy B: everything to Latin.
        b_text, b_status = (q["query_text"], "unchanged") if script == "Latin" else romanize(q["query_text"], script)
        if b_status == "ok" and b_text != q["query_text"]:
            stats["B_q"]["romanised"] += 1
        elif b_status.startswith("error"):
            stats["B_q"]["error"] += 1
        else:
            stats["B_q"]["unchanged"] += 1
        out_queries[q["query_id"]] = {
            "query_id": q["query_id"],
            "raw": q["query_text"],
            "script_declared": q["query_script"],
            "script_detected": script,
            "lang": lang,
            "query_type": q["query_type"],
            "relevant": [g for g in q["relevant_doc_ids"].split("|") if g],
            "A_to_script": a_text,
            "A_status": a_status,
            "B_to_latin": b_text,
            "B_status": b_status,
        }

    payload = {
        "normalization_tool": "indic-transliteration",
        "tool_version": "2.3.75",
        "schemes": SCHEME,
        "stats": {k: v for k, v in stats.items() if not isinstance(v, list)},
        "script_disagreements": stats.get("script_disagreements", []),
        "documents": out_docs,
        "queries": out_queries,
    }
    path = os.path.join(OUTDIR, "normalized_inputs.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    print("wrote %s" % path)
    print("docs=%d queries=%d" % (len(out_docs), len(out_queries)))
    print("A (query->native script): %s" % stats["A"])
    print("B (all->latin) docs    : %s" % stats["B_doc"])
    print("B (all->latin) queries : %s" % stats["B_q"])
    if stats.get("script_disagreements"):
        print("script label disagreements: %d" % len(stats["script_disagreements"]))
        for x in stats["script_disagreements"][:5]:
            print("   %s declared=%s detected=%s" % (x["doc_id"], x["declared"], x["detected"]))


if __name__ == "__main__":
    main()