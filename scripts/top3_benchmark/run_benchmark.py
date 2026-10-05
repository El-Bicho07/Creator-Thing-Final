#!/usr/bin/env python3
"""
Top-3 embedding benchmark runner (Creator Platform SaaS).

Fairness design (see task section 10)
--------------------------------------
All candidates share ONE retrieval pipeline:

    encode(text) -> L2-normalised float32 matrix (in RAM, numpy)
    query        -> encode with the model's documented QUERY convention
    documents    -> encode with the model's documented PASSAGE convention
    score        -> cosine similarity  (dot product of normalised vectors)
    ranking      -> stable argsort descending, take top-k

Nothing is written to PostgreSQL. No pgvector index is created or touched.
Each model runs in its own subprocess so peak RSS is attributable to exactly
one model, and the model is released before the next one loads.

Model-specific input conventions (taken from each model card, NOT guessed):

  Tamil-ai/tamil-embed-base  query: "query: ..."   passage: "passage: ..."
                             (fine-tuned from multilingual-e5-base; its card
                              shows query:/passage: usage)
  intfloat/multilingual-e5-base
                             query: "query: ..."   passage: "passage: ..."
                             (documented asymmetric retrieval format)
  BAAI/bge-m3                query: raw text       passage: raw text
                             ("the BGE-M3 model no longer requires adding
                              instructions to the queries")

Matryoshka truncation for Tamil-Embed follows its card: slice the normalised
sentence embedding to [:N].
"""

import argparse
import gc
import json
import os
import platform
import statistics
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(os.environ.get("TOP3_ROOT", Path(__file__).resolve().parents[2]))
OUT = Path(os.environ.get("TOP3_OUT", ROOT / "docs" / "eval" / "embedding_top3_benchmark"))
DATASET = Path(os.environ.get("TOP3_DATASET", OUT / "dataset.json"))

# --------------------------------------------------------------------------
# Candidate registry. `variants` are separate measured configurations.
# --------------------------------------------------------------------------
CANDIDATES = {
    "tamil_embed": {
        "label": "Tamil-ai/tamil-embed-base",
        "repo": "Tamil-ai/tamil-embed-base",
        "trust_remote_code": True,
        "query_prefix": "query: ",
        "passage_prefix": "passage: ",
        "base_dim": 768,
        "variants": [("768", 768), ("512", 512), ("256", 256)],
    },
    "e5_base": {
        "label": "intfloat/multilingual-e5-base",
        "repo": "intfloat/multilingual-e5-base",
        "trust_remote_code": False,
        "query_prefix": "query: ",
        "passage_prefix": "passage: ",
        "base_dim": 768,
        "variants": [("768", 768)],
    },
    "e5_base_nopfx_ABLATION": {
        "label": "intfloat/multilingual-e5-base (ABLATION: no prefixes)",
        "repo": "intfloat/multilingual-e5-base",
        "trust_remote_code": False,
        "query_prefix": "",
        "passage_prefix": "",
        "base_dim": 768,
        "variants": [("768", 768)],
    },
    "tamil_embed_nopfx_ABLATION": {
        "label": "Tamil-ai/tamil-embed-base (ABLATION: no prefixes)",
        "repo": "Tamil-ai/tamil-embed-base",
        "trust_remote_code": True,
        "query_prefix": "",
        "passage_prefix": "",
        "base_dim": 768,
        "variants": [("768", 768)],
    },
    "bge_m3": {
        "label": "BAAI/bge-m3",
        "repo": "BAAI/bge-m3",
        "trust_remote_code": False,
        "query_prefix": "",
        "passage_prefix": "",
        "base_dim": 1024,
        "variants": [("1024", 1024)],
    },
}

TOPK_MAX = 5


# --------------------------------------------------------------------------
# metrics
# --------------------------------------------------------------------------
def rank_of_first_relevant(ranked_ids, relevant_set):
    for i, did in enumerate(ranked_ids):
        if did in relevant_set:
            return i + 1
    return None


def dcg(gains):
    return sum(g / np.log2(i + 2) for i, g in enumerate(gains))


def compute_metrics(per_query):
    """per_query: list of dicts with rank (1-based or None) and graded gains."""
    n = len(per_query)
    if n == 0:
        return {}
    out = {}
    for k in (1, 3, 5):
        hits = sum(1 for q in per_query if q["rank"] is not None and q["rank"] <= k)
        out[f"recall@{k}"] = hits / n
    mrrs = [1.0 / q["rank"] for q in per_query if q["rank"] is not None]
    out["mrr"] = sum(mrrs) / n if mrrs else 0.0
    ndcgs = []
    for q in per_query:
        ideal = sorted([g for g in q["top5_gains"]], reverse=True)
        idcg = dcg(ideal)
        ndcgs.append(dcg(q["top5_gains"]) / idcg if idcg > 0 else 0.0)
    out["ndcg@5"] = sum(ndcgs) / n if ndcgs else 0.0
    out["n_queries"] = n
    out["hit_rate_any"] = sum(1 for q in per_query if q["rank"] is not None) / n
    return out


def percentile(xs, p):
    if not xs:
        return None
    s = sorted(xs)
    if len(s) == 1:
        return s[0]
    k = (len(s) - 1) * p
    lo, hi = int(np.floor(k)), int(np.ceil(k))
    if lo == hi:
        return s[lo]
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def lat_stats(times_ms):
    if not times_ms:
        return {}
    return {
        "mean_ms": round(statistics.mean(times_ms), 3),
        "p50_ms": round(percentile(times_ms, 0.50), 3),
        "p95_ms": round(percentile(times_ms, 0.95), 3),
        "p99_ms": round(percentile(times_ms, 0.99), 3),
        "min_ms": round(min(times_ms), 3),
        "max_ms": round(max(times_ms), 3),
        "n": len(times_ms),
    }


# --------------------------------------------------------------------------
# model runner (executed inside a per-model subprocess)
# --------------------------------------------------------------------------
def run_one_model(key, cfg, dataset, gpu: bool):
    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if (gpu and torch.cuda.is_available()) else "cpu"
    t_load0 = time.perf_counter()
    model = SentenceTransformer(cfg["repo"], trust_remote_code=cfg["trust_remote_code"],
                                device=device)
    load_s = time.perf_counter() - t_load0

    cfgm = json.loads(Path(cfg["_config_path"]).read_text())

    docs = dataset["documents"]
    queries = dataset["queries"]
    doc_texts = [d["text"] for d in docs]
    doc_ids = [d["id"] for d in docs]
    doc_index = {d["id"]: d for d in docs}
    q_texts = [q["text"] for q in queries]

    qp, pp = cfg["query_prefix"], cfg["passage_prefix"]
    q_inputs = [qp + t for t in q_texts]
    d_inputs = [pp + t for t in doc_texts]

    batch = cfgm["batch_size"]
    maxlen = cfgm["max_seq_length"]

    def enc(texts):
        return model.encode(texts, batch_size=batch, max_length=maxlen,
                            convert_to_numpy=True, normalize_embeddings=True,
                            show_progress_bar=False).astype(np.float32)

    result = {
        "candidate_key": key,
        "label": cfg["label"],
        "repo": cfg["repo"],
        "device": device,
        "model_load_seconds": round(load_s, 2),
        "config": {
            **cfgm,
            "query_prefix": qp,
            "passage_prefix": pp,
            "tokenizer": type(model.tokenizer).__name__,
            "pooling": type(model._modules.get("Pooling")).__name__
            if "Pooling" in model._modules else None,
            "normalize_module": "Normalize" if "Normalize" in model._modules else None,
            "truncation": "sentence-transformers max_length (truncates tail)",
            "revision": getattr(model, "_target_name", cfg["repo"]),
        },
        "variants": {},
        "latency": {},
        "resource": {},
    }

    # ---------------- warm-up (excluded from cold measurement) -------------
    enc(["warmup text one", "warmup text two", "warmup text three"])

    # ---------------- cold latency (first real batch after load) -----------
    cold_samples = []
    for _ in range(3):
        t0 = time.perf_counter()
        enc(doc_texts[:batch])
        cold_samples.append((time.perf_counter() - t0) * 1000)
    result["latency"]["cold_first_batch_ms"] = round(cold_samples[0], 3)
    result["latency"]["cold_samples_ms"] = [round(x, 3) for x in cold_samples]

    # ---------------- single-query latency --------------------------------
    single_times = []
    for _ in range(cfgm["single_query_runs"]):
        t0 = time.perf_counter()
        enc([q_inputs[0]])
        single_times.append((time.perf_counter() - t0) * 1000)
    result["latency"]["single_query"] = lat_stats(single_times)

    # ---------------- batch embedding latency -----------------------------
    batch_times = []
    for _ in range(cfgm["batch_runs"]):
        t0 = time.perf_counter()
        enc(doc_texts)
        batch_times.append((time.perf_counter() - t0) * 1000)
    result["latency"]["batch_documents"] = lat_stats(batch_times)

    # ---------------- throughput -----------------------------------------
    t0 = time.perf_counter()
    enc(doc_texts)
    doc_secs = time.perf_counter() - t0
    t0 = time.perf_counter()
    enc(q_inputs)
    q_secs = time.perf_counter() - t0
    result["latency"]["throughput"] = {
        "documents_per_second": round(len(doc_texts) / doc_secs, 2),
        "queries_per_second": round(len(q_inputs) / q_secs, 2),
        "n_documents": len(doc_texts),
        "n_queries": len(q_inputs),
    }

    # ---------------- embed once per (prefix-set), reuse per dim ----------
    D = enc(d_inputs)          # (n_docs, base_dim) already L2-normalised
    Q = enc(q_inputs)

    result["resource"]["rss_mb_after_load_and_encode"] = round(_rss_mb(), 1)
    result["resource"]["peak_rss_mb"] = round(_peak_rss_mb(), 1)
    result["resource"]["disk_mb"] = round(_disk_mb(cfg["repo"]), 1)

    for vlabel, vdim in cfg["variants"]:
        assert vdim <= D.shape[1], f"{vlabel} > base dim {D.shape[1]}"
        # Matryoshka / dimension slice on the NORMALISED vector, then
        # re-normalise so cosine stays a plain dot product.
        Dv = D[:, :vdim].copy()
        Qv = Q[:, :vdim].copy()
        Dv /= np.clip(np.linalg.norm(Dv, axis=1, keepdims=True), 1e-12, None)
        Qv /= np.clip(np.linalg.norm(Qv, axis=1, keepdims=True), 1e-12, None)

        # scores: Qv @ Dv.T  -> (n_q, n_doc)
        sims = Qv @ Dv.T

        per_query = []
        for qi, q in enumerate(queries):
            order = np.argsort(-sims[qi], kind="stable")[:TOPK_MAX]
            ranked_ids = [doc_ids[j] for j in order]
            rel = set(q.get("relevant", []))
            relx = set(q.get("related", []))
            gains = []
            for did in ranked_ids:
                gains.append(2 if did in rel else (1 if did in relx else 0))
            per_query.append({
                "query_id": q["id"],
                "phenomenon": q["phenomenon"],
                "query_lang": q["lang"],
                "rank": rank_of_first_relevant(ranked_ids, rel),
                "top5_gains": gains,
                "top5_ids": ranked_ids,
            })

        # overall + slices
        vres = {"metrics_overall": compute_metrics(per_query), "per_phenomenon": {}, "per_query_lang": {}}
        for keyname, field in (("per_phenomenon", "phenomenon"), ("per_query_lang", "query_lang")):
            buckets = {}
            for pq in per_query:
                buckets.setdefault(pq[field], []).append(pq)
            vres[keyname] = {k: compute_metrics(v) for k, v in sorted(buckets.items())}

        result["variants"][vlabel] = {
            "dim": int(vdim),
            "metrics_overall": vres["metrics_overall"],
            "per_phenomenon": vres["per_phenomenon"],
            "per_query_lang": vres["per_query_lang"],
            "per_query": per_query,
            "storage": {
                "bytes_per_vector_fp32": vdim * 4,
                "kb_per_vector": round(vdim * 4 / 1024, 3),
                "mb_per_1m_vectors": round(vdim * 4 * 1_000_000 / (1024 ** 2), 1),
            },
        }

        # dimension-slice latency (embedding at reduced dim does not change
        # compute, so we record the same encode cost and note it)
        result["latency"][f"encode_batch_{vlabel}"] = result["latency"]["batch_documents"]

    del D, Q
    gc.collect()
    return result


def _rss_mb():
    import psutil
    return psutil.Process().memory_info().rss / 1024 / 1024


def _peak_rss_mb():
    import resource
    # ru_maxrss is KiB on Linux
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def _disk_mb(repo_name):
    from huggingface_hub import snapshot_download
    try:
        p = Path(snapshot_download(repo_name, allow_patterns=["*.json", "*.txt",
                                                              "*.model", "*.safetensors"]))
        total = sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
        return total / (1024 ** 2)
    except Exception:
        return 0.0


# --------------------------------------------------------------------------
# driver: one subprocess per model for clean memory attribution
# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gpu", action="store_true", help="also measure on GPU (separate)")
    ap.add_argument("--only", default=None, help="comma-separated candidate keys")
    args = ap.parse_args()

    dataset = json.loads(DATASET.read_text(encoding="utf-8"))

    cfg = {
        "batch_size": 16,
        "max_seq_length": 512,
        "single_query_runs": 40,
        "batch_runs": 10,
        "device_preference": "cpu",
        "rationale": "CPU-first: the target deployment must not depend on the 4GB RTX 2050.",
        "similarity": "cosine (dot product of L2-normalised vectors)",
        "retrieval": "numpy in-memory; argsort top-5; NO pgvector involved",
        "matryoshka": "slice normalised sentence embedding to [:N], then re-normalise",
    }
    (OUT / "benchmark_config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")

    keys = args.only.split(",") if args.only else list(CANDIDATES)
    raw_path = OUT / "_raw_partial.json"
    all_results = {}
    if raw_path.exists():
        all_results = json.loads(raw_path.read_text())

    for key in keys:
        c = dict(CANDIDATES[key])
        cfg_path = OUT / f"_cfg_{key}.json"
        cfg_path.write_text(json.dumps(cfg), encoding="utf-8")
        c["_config_path"] = str(cfg_path)

        cmd = [sys.executable, __file__, "--_child", key, "--_config", str(cfg_path)]
        if args.gpu:
            cmd.append("--gpu")
        print(f"[runner] launching isolated process for {key} ...", flush=True)
        t0 = time.perf_counter()
        proc = subprocess.run(cmd, capture_output=True, text=True)
        wall = time.perf_counter() - t0
        if proc.returncode != 0:
            print(proc.stdout[-4000:])
            print(proc.stderr[-4000:], file=sys.stderr)
            raise SystemExit(f"child failed for {key}")
        payload = json.loads(proc.stdout.strip().split("__RESULT__")[-1])
        payload["subprocess_wall_seconds"] = round(wall, 2)
        all_results[key] = payload
        raw_path.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")
        m = payload["variants"]
        for vl, v in m.items():
            om = v["metrics_overall"]
            print(f"  {payload['label']} @{vl}d  R@1={om['recall@1']:.3f} "
                  f"R@3={om['recall@3']:.3f} R@5={om['recall@5']:.3f} "
                  f"MRR={om['mrr']:.3f} nDCG@5={om['ndcg@5']:.3f}", flush=True)
        cfg_path.unlink(missing_ok=True)

    (OUT / "raw_results.json").write_text(
        json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    if "--_child" in sys.argv:
        i = sys.argv.index("--_child")
        key = sys.argv[i + 1]
        cfgp = sys.argv[sys.argv.index("--_config") + 1]
        c = dict(CANDIDATES[key])
        c["_config_path"] = cfgp
        ds = json.loads(DATASET.read_text(encoding="utf-8"))
        r = run_one_model(key, c, ds, "--gpu" in sys.argv)
        sys.stdout.write("__RESULT__" + json.dumps(r, ensure_ascii=False))
        sys.exit(0)
    main()
