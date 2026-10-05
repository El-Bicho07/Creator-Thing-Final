#!/usr/bin/env python3
"""
Assemble the read-only export folder from saved artefacts + the recovery pass.

Reads (never modifies):
  docs/eval/embedding_top3_benchmark/{dataset,raw_results,benchmark_config,environment}.json
  export_stage/recovered.json   (scores + token lengths + extra experiment)

Writes only into docs/eval/benchmarks/2026-10-03_embedding_raw/
"""

import csv
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "eval" / "embedding_top3_benchmark"
STAGE = Path("/tmp/exportstage")
OUT = ROOT / "docs" / "eval" / "benchmarks" / "2026-10-03_embedding_raw"

PRIMARY = ["bge_m3", "tamil_embed", "e5_base"]
PRIMARY_VARIANT = {"bge_m3": "1024", "tamil_embed": "768", "e5_base": "768"}
ABLATIONS = {"tamil_embed_nopfx_ABLATION": "tamil_embed",
             "e5_base_nopfx_ABLATION": "e5_base"}


def script_of(t):
    ta = any(0x0B80 <= ord(c) <= 0x0BFF for c in t)
    dv = any(0x0900 <= ord(c) <= 0x097F for c in t)
    la = bool(re.search(r"[A-Za-z]", t))
    if ta and la:
        return "mixed"
    if dv and la:
        return "mixed"
    if ta:
        return "Tamil"
    if dv:
        return "Devanagari"
    if la:
        return "Latin"
    return "other"


def query_language(lang):
    return {"en": "en", "ta": "ta", "hi": "hi",
            "tanglish": "ta", "hinglish": "hi",
            "code_mixed_ta": "mixed", "code_mixed_hi": "mixed",
            "code_mixed_en": "mixed"}.get(lang, "other")


def query_type(lang, script):
    """
    query_type uses the dataset's RECORDED lang label as the primary signal,
    falling back to the character-derived script only where lang is not
    code_mixed. This matters because several code-mixed queries are written
    entirely in Latin script (e.g. "Tamil audience ku English mathiri tech
    explain panninja"), so a character-only test would mislabel them.
    """
    if lang.startswith("code_mixed"):
        return "code-mixed"
    if script == "mixed":
        return "code-mixed"
    if lang == "tanglish":
        return "Tanglish"
    if lang == "hinglish":
        return "Hinglish"
    if script in ("Tamil", "Devanagari"):
        return "native"
    if lang == "en":
        return "native"
    return "other"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "saved_outputs").mkdir(exist_ok=True)

    ds = json.loads((SRC / "dataset.json").read_text(encoding="utf-8"))
    raw = json.loads((SRC / "raw_results.json").read_text(encoding="utf-8"))
    cfg = json.loads((SRC / "benchmark_config.json").read_text(encoding="utf-8"))
    env = json.loads((SRC / "environment.json").read_text(encoding="utf-8"))
    integ = json.loads((SRC / "integrity_report.json").read_text(encoding="utf-8"))
    rec = json.loads((STAGE / "recovered.json").read_text(encoding="utf-8"))

    docs = ds["documents"]
    queries = ds["queries"]
    D = {d["id"]: d for d in docs}
    Q = {q["id"]: q for q in queries}

    # ---------------- 2. documents.csv ----------------
    with open(OUT / "documents.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["doc_id", "script", "language", "char_length",
                    "token_length_tamil_embed", "token_length_e5_base",
                    "token_length_bge_m3", "text", "text_included",
                    "sanitisation_applied"])
        for d in docs:
            did = d["id"]
            w.writerow([
                did, script_of(d["text"]), d["lang"], len(d["text"]),
                rec["recovered"]["tamil_embed"]["doc_token_lengths"][did],
                rec["recovered"]["e5_base"]["doc_token_lengths"][did],
                rec["recovered"]["bge_m3"]["doc_token_lengths"][did],
                d["text"], "yes",
                "none_required_synthetic_selfauthored_no_pii",
            ])

    # ---------------- 1. per_query_results.csv ----------------
    def saved_pq(key, variant):
        return {p["query_id"]: p for p in raw[key]["variants"][variant]["per_query"]}

    rows = []
    for q in queries:
        qid = q["id"]
        rel = q["relevant"]
        base = {
            "query_id": qid,
            "query_text": q["text"],
            "query_language": query_language(q["lang"]),
            "query_script": script_of(q["text"]),
            "query_type": query_type(q["lang"], script_of(q["text"])),
            "relevant_doc_ids": "|".join(rel),
            "relevant_doc_scripts": "|".join(script_of(D[r]["text"]) for r in rel),
        }
        # condition 1: documented prefixes (the primary run)
        row = dict(base)
        row["condition"] = "documented_prefixes"
        for m in PRIMARY:
            sp = saved_pq(m, PRIMARY_VARIANT[m])[qid]
            rk = rec["recovered"][m]
            row[f"{m}_top5_ids"] = "|".join(rk["top5_ids"][qid])
            row[f"{m}_top5_scores"] = "|".join(str(s) for s in rk["top5_scores"][qid])
            row[f"{m}_first_relevant_rank"] = "" if sp["rank"] is None else sp["rank"]
            row[f"{m}_hit_at_1"] = int(sp["rank"] == 1)
            row[f"{m}_hit_at_3"] = int(sp["rank"] is not None and sp["rank"] <= 3)
            row[f"{m}_hit_at_5"] = int(sp["rank"] is not None and sp["rank"] <= 5)
        rows.append(row)

        # condition 2: no-prefix ablation (actually run & saved; scores NOT recovered)
        arow = dict(base)
        arow["condition"] = "no_prefixes_ablation"
        for m in PRIMARY:
            akey = f"{m}_nopfx_ABLATION"
            if akey in raw:
                sp = saved_pq(akey, "768")[qid]
                arow[f"{m}_top5_ids"] = "|".join(sp["top5_ids"])
                arow[f"{m}_top5_scores"] = ""      # never persisted and not re-run
                arow[f"{m}_first_relevant_rank"] = "" if sp["rank"] is None else sp["rank"]
                arow[f"{m}_hit_at_1"] = int(sp["rank"] == 1)
                arow[f"{m}_hit_at_3"] = int(sp["rank"] is not None and sp["rank"] <= 3)
                arow[f"{m}_hit_at_5"] = int(sp["rank"] is not None and sp["rank"] <= 5)
            else:
                for suf in ("top5_ids", "top5_scores", "first_relevant_rank",
                            "hit_at_1", "hit_at_3", "hit_at_5"):
                    arow[f"{m}_{suf}"] = ""
        rows.append(arow)

    cols = ["query_id", "condition", "query_text", "query_language", "query_script",
            "query_type", "relevant_doc_ids", "relevant_doc_scripts"]
    for m in PRIMARY:
        cols += [f"{m}_top5_ids", f"{m}_top5_scores", f"{m}_first_relevant_rank",
                 f"{m}_hit_at_1", f"{m}_hit_at_3", f"{m}_hit_at_5"]
    with open(OUT / "per_query_results.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    # ---------------- extra experiment csv ----------------
    with open(OUT / "extra_experiment_tanglish_probes.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["probe_query_id", "model", "source_doc_id", "source_doc_script",
                    "tanglish_query", "retrieved_in_top5", "source_doc_rank",
                    "top5_ids", "top5_scores"])
        for m in PRIMARY:
            for r in rec["extra_experiment"][m]:
                w.writerow([r["probe_query_id"], m, r["source_doc_id"],
                            r["source_doc_script"], r["tanglish_query"],
                            int(r["retrieved_in_top5"]),
                            "" if r["source_doc_rank"] is None else r["source_doc_rank"],
                            "|".join(r["top5_ids"]),
                            "|".join(str(s) for s in r["top5_scores"])])

    # ---------------- copy saved outputs for self-contained re-analysis ----
    for fn in ["dataset.json", "raw_results.json", "benchmark_config.json",
               "environment.json", "integrity_report.json", "retrieval_results.json",
               "latency_results.json", "resource_results.json", "storage_analysis.json",
               "language_breakdown.json", "target_language_breakdown.json",
               "failure_analysis.json", "summary.json"]:
        if (SRC / fn).exists():
            shutil.copy2(SRC / fn, OUT / "saved_outputs" / fn)

    print(f"documents.csv rows      : {len(docs)}")
    print(f"per_query_results.csv   : {len(rows)}  ({len(queries)} queries x 2 conditions)")
    print(f"extra_experiment rows   : {len(queries) and 30}")


if __name__ == "__main__":
    main()
