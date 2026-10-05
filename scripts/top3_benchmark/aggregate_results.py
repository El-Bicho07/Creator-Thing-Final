#!/usr/bin/env python3
"""
Aggregate top-3 benchmark results into the required output artefacts.

Produces:
  retrieval_results.json
  latency_results.json
  resource_results.json
  storage_analysis.json
  language_breakdown.json
  summary.json
  environment.json
  failure_analysis.json
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "eval" / "embedding_top3_benchmark"

PRIMARY = [("tamil_embed", "768"), ("e5_base", "768"), ("bge_m3", "1024")]
MATRYOSHKA = [("tamil_embed", "768"), ("tamil_embed", "512"), ("tamil_embed", "256")]
ABLATIONS = [("tamil_embed_nopfx_ABLATION", "768"), ("e5_base_nopfx_ABLATION", "768")]

SCRIPT_RANGES = {
    "latin": ((0x0041, 0x024F), (0x1E00, 0x1EFF)),
    "tamil": ((0x0B80, 0x0BFF),),
    "devanagari": ((0x0900, 0x097F),),
}


def script_of(text):
    tamil = dev = latin = False
    for ch in text:
        o = ord(ch)
        if 0x0B80 <= o <= 0x0BFF:
            tamil = True
        if 0x0900 <= o <= 0x097F:
            dev = True
        if (0x41 <= o <= 0x5A) or (0x61 <= o <= 0x7A):
            latin = True
    if tamil:
        return "tamil"
    if dev:
        return "devanagari"
    if latin:
        return "latin"
    return "other"


def main():
    raw = json.loads((OUT / "raw_results.json").read_text(encoding="utf-8"))
    ds = json.loads((OUT / "dataset.json").read_text(encoding="utf-8"))
    docs = {d["id"]: d for d in ds["documents"]}
    queries = {q["id"]: q for q in ds["queries"]}

    # ---------------- retrieval_results.json ----------------
    retrieval = {"primary": {}, "matryoshka": {}, "ablations": {}}
    for k, v in PRIMARY:
        retrieval["primary"][f"{k}@{v}"] = {
            "label": raw[k]["label"],
            "overall": raw[k]["variants"][v]["metrics_overall"],
            "per_phenomenon": raw[k]["variants"][v]["per_phenomenon"],
            "per_query_lang": raw[k]["variants"][v]["per_query_lang"],
            "input_convention": {
                "query_prefix": raw[k]["config"]["query_prefix"],
                "passage_prefix": raw[k]["config"]["passage_prefix"],
                "source": "model card (documented usage)",
            },
        }
    for k, v in MATRYOSHKA:
        retrieval["matryoshka"][f"{k}@{v}"] = {
            "label": raw[k]["label"],
            "dim": raw[k]["variants"][v]["dim"],
            "overall": raw[k]["variants"][v]["metrics_overall"],
            "per_phenomenon": raw[k]["variants"][v]["per_phenomenon"],
        }
    for k, v in ABLATIONS:
        retrieval["ablations"][f"{k}@{v}"] = {
            "label": raw[k]["label"],
            "note": "ABLATION ONLY - not a production configuration",
            "overall": raw[k]["variants"][v]["metrics_overall"],
            "per_phenomenon": raw[k]["variants"][v]["per_phenomenon"],
        }
    (OUT / "retrieval_results.json").write_text(
        json.dumps(retrieval, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- latency_results.json ----------------
    lat = {}
    for k in raw:
        L = raw[k]["latency"]
        lat[f"{k}"] = {
            "label": raw[k]["label"],
            "device": raw[k]["device"],
            "model_load_seconds": raw[k]["model_load_seconds"],
            "cold_first_batch_ms": L["cold_first_batch_ms"],
            "cold_samples_ms": L["cold_samples_ms"],
            "single_query": L["single_query"],
            "batch_documents_113": L["batch_documents"],
            "throughput": L["throughput"],
        }
    (OUT / "latency_results.json").write_text(
        json.dumps(lat, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- resource_results.json ----------------
    res = {}
    for k in raw:
        r = raw[k]["resource"]
        res[k] = {
            "label": raw[k]["label"],
            "device": raw[k]["device"],
            "rss_mb_steady_after_encode": r["rss_mb_after_load_and_encode"],
            "peak_rss_mb": r["peak_rss_mb"],
            "disk_download_mb": r["disk_mb"],
            "params": {"tamil_embed": "278M", "e5_base": "278M", "bge_m3": "568M"}
                      .get(k.replace("_nopfx_ABLATION", ""), "n/a"),
        }
    (OUT / "resource_results.json").write_text(
        json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- storage_analysis.json ----------------
    storage = {
        "assumption": "1,000,000 vectors, float32, raw vector bytes only "
                      "(excludes pgvector HNSW/IVFFlat graph overhead)",
        "note": "Measured dimensionality; no PostgreSQL/pgvector object was created.",
        "entries": [],
    }
    for k, v in MATRYOSHKA + [("e5_base", "768"), ("bge_m3", "1024")]:
        dim = raw[k]["variants"][v]["dim"]
        b = dim * 4
        storage["entries"].append({
            "config": f"{k}@{v}",
            "label": raw[k]["label"],
            "dim": dim,
            "bytes_per_vector": b,
            "kb_per_vector": round(b / 1024, 3),
            "mb_per_1m": round(b * 1_000_000 / (1024 ** 2), 1),
            "gb_per_1m": round(b * 1_000_000 / (1024 ** 3), 3),
            "relative_to_768": round(dim / 768, 3),
            "matches_current_production_vector_384": dim == 384,
        })
    base = next(e for e in storage["entries"] if e["config"] == "e5_base@768")["mb_per_1m"]
    for e in storage["entries"]:
        e["relative_storage_vs_768"] = round(e["mb_per_1m"] / base, 3)
    (OUT / "storage_analysis.json").write_text(
        json.dumps(storage, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- language_breakdown.json ----------------
    def by_script_of_query(q):
        return script_of(q["text"])

    lang = {}
    for k, v in PRIMARY:
        pq = raw[k]["variants"][v]["per_query"]
        buckets = defaultdict(list)
        for r in pq:
            buckets[script_of(queries[r["query_id"]]["text"])].append(r)
        entry = {"overall": raw[k]["variants"][v]["metrics_overall"], "by_query_script": {}}
        for s, rows in sorted(buckets.items()):
            def m(rs):
                n = len(rs)
                r1 = sum(1 for x in rs if x["rank"] and x["rank"] <= 1) / n
                r3 = sum(1 for x in rs if x["rank"] and x["rank"] <= 3) / n
                r5 = sum(1 for x in rs if x["rank"] and x["rank"] <= 5) / n
                mrr = sum([1 / x["rank"] for x in rs if x["rank"]]) / n
                return {"n": n, "recall@1": round(r1, 4), "recall@3": round(r3, 4),
                        "recall@5": round(r5, 4), "mrr": round(mrr, 4)}
            entry["by_query_script"][s] = m(rows)
        entry["per_phenomenon"] = raw[k]["variants"][v]["per_phenomenon"]
        lang[f"{k}@{v}"] = entry
    (OUT / "language_breakdown.json").write_text(
        json.dumps(lang, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- failure_analysis.json ----------------
    CROSS_SCRIPT = ["tanglish_ta", "tanglish_en", "ta_tanglish",
                    "hinglish_hi", "hinglish_en", "hi_hinglish"]
    fa = {"description": "Where each primary candidate fails, with concrete evidence.",
          "per_model": {}}
    for k, v in PRIMARY:
        pq = raw[k]["variants"][v]["per_query"]
        cross = [x for x in pq if x["phenomenon"] in CROSS_SCRIPT]
        miss = [x for x in cross if not x["rank"] or x["rank"] > 3]
        # script-mismatch evidence
        same_script_slots = 0
        total_slots = 0
        for x in cross:
            qs = script_of(queries[x["query_id"]]["text"])
            for did in x["top5_ids"]:
                total_slots += 1
                if script_of(docs[did]["text"]) == qs:
                    same_script_slots += 1
        fa["per_model"][f"{k}@{v}"] = {
            "cross_script_queries": len(cross),
            "cross_script_missed_at_3": len(miss),
            "cross_script_miss_rate": round(len(miss) / len(cross), 4) if cross else None,
            "top5_slots_matching_query_script": same_script_slots,
            "top5_slots_total": total_slots,
            "script_lock_ratio": round(same_script_slots / total_slots, 4) if total_slots else None,
            "examples": [
                {"query_id": x["query_id"], "phenomenon": x["phenomenon"],
                 "query": queries[x["query_id"]]["text"][:70],
                 "expected": queries[x["query_id"]]["relevant"][:2],
                 "retrieved_top3": [
                     {"id": i, "lang": docs[i]["lang"],
                      "script": script_of(docs[i]["text"]),
                      "text": docs[i]["text"][:70]}
                     for i in x["top5_ids"][:3]],
                 "first_relevant_rank": x["rank"]}
                for x in miss[:8]
            ],
        }
    (OUT / "failure_analysis.json").write_text(
        json.dumps(fa, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- summary.json ----------------
    summary = {"benchmark": "top3_embedding_benchmark",
               "dataset_sha256_16": ds["metadata"]["dataset_sha256_16"],
               "n_documents": len(ds["documents"]), "n_queries": len(ds["queries"]),
               "primary_configs": [], "matryoshka": [], "ablations": [],
               "production_schema_untouched": "chunks.embedding remains vector(384)",
               "records": []}
    for k, v in PRIMARY:
        rec = {
            "config": f"{k}@{v}",
            "label": raw[k]["label"],
            "repo": raw[k]["repo"],
            "dim": raw[k]["variants"][v]["dim"],
            "query_prefix": raw[k]["config"]["query_prefix"],
            "passage_prefix": raw[k]["config"]["passage_prefix"],
            "max_seq_length": raw[k]["config"]["max_seq_length"],
            "recall@1": round(raw[k]["variants"][v]["metrics_overall"]["recall@1"], 4),
            "recall@3": round(raw[k]["variants"][v]["metrics_overall"]["recall@3"], 4),
            "recall@5": round(raw[k]["variants"][v]["metrics_overall"]["recall@5"], 4),
            "mrr": round(raw[k]["variants"][v]["metrics_overall"]["mrr"], 4),
            "ndcg@5": round(raw[k]["variants"][v]["metrics_overall"]["ndcg@5"], 4),
            "single_query_p95_ms": raw[k]["latency"]["single_query"]["p95_ms"],
            "batch_p95_ms": raw[k]["latency"]["batch_documents"]["p95_ms"],
            "documents_per_second": raw[k]["latency"]["throughput"]["documents_per_second"],
            "peak_rss_mb": raw[k]["resource"]["peak_rss_mb"],
            "disk_mb": raw[k]["resource"]["disk_mb"],
            "mb_per_1m_vectors": raw[k]["variants"][v]["storage"]["mb_per_1m_vectors"],
            "role": "PRIMARY",
        }
        summary["records"].append(rec)
        summary["primary_configs"].append(rec["config"])
    for k, v in MATRYOSHKA:
        summary["matryoshka"].append({
            "config": f"{k}@{v}", "dim": raw[k]["variants"][v]["dim"],
            "recall@3": round(raw[k]["variants"][v]["metrics_overall"]["recall@3"], 4),
            "mrr": round(raw[k]["variants"][v]["metrics_overall"]["mrr"], 4),
            "mb_per_1m_vectors": raw[k]["variants"][v]["storage"]["mb_per_1m_vectors"],
            "role": "MATRYOSHKA_VARIANT"})
    for k, v in ABLATIONS:
        summary["ablations"].append({
            "config": f"{k}@{v}", "label": raw[k]["label"],
            "recall@3": round(raw[k]["variants"][v]["metrics_overall"]["recall@3"], 4),
            "mrr": round(raw[k]["variants"][v]["metrics_overall"]["mrr"], 4),
            "role": "ABLATION_NOT_PRODUCTION"})
    (OUT / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    print("wrote retrieval_results.json latency_results.json resource_results.json")
    print("wrote storage_analysis.json language_breakdown.json failure_analysis.json summary.json")


if __name__ == "__main__":
    main()
