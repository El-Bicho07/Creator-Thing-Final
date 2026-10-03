#!/usr/bin/env python3
"""
Follow-up retrieval runner: raw vs normalized, 3 models.

Runs INSIDE the API container (torch / sentence-transformers / model weights
are only present there). Must not be installed into, or modify, the API image.

Conditions
  raw                   raw queries, raw documents                 (baseline)
  norm_q_to_script      queries transliterated to native script,   (Option A)
                        documents untouched
  norm_all_to_latin     queries + documents all in Latin script   (Option B)

Only the text changes between conditions. Model, revision, prefixes,
max_length, batch_size, normalisation and tie-breaking are held identical, so
the comparison isolates normalization.

A HARD GATE re-runs the raw condition and aborts unless every top-5 id
ordering reproduces the saved original benchmark exactly, per model.

Embedding models (NOT the normalization tool):
  BAAI/bge-m3, Tamil-ai/tamil-embed-base, intfloat/multilingual-e5-base
"""
import json
import os
import sys

import numpy as np

TOPK = 5

MODELS = [
    {
        "key": "bge_m3",
        "repo": "BAAI/bge-m3",
        "revision": "5617a9f61b028005a4858fdac845db406aefb181",
        "query_prefix": "",
        "passage_prefix": "",
        "trust_remote_code": False,
    },
    {
        "key": "tamil_embed",
        "repo": "Tamil-ai/tamil-embed-base",
        "revision": "a5b5aa23a0a7eee1e7eccee53c5835c6e68b06ce",
        "query_prefix": "query: ",
        "passage_prefix": "passage: ",
        "trust_remote_code": True,
    },
    {
        "key": "e5_base",
        "repo": "intfloat/multilingual-e5-base",
        "revision": "d128750597153bb5987e10b1c3493a34e5a4502a",
        "query_prefix": "query: ",
        "passage_prefix": "passage: ",
        "trust_remote_code": False,
    },
]

BATCH = 16
MAXLEN = 512


def load_inputs(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    stage = os.environ.get("FOLLOWUP_IN", "/app/followup/normalized_inputs.json")
    outp = os.environ.get("FOLLOWUP_OUT", "/app/followup/raw_retrieval.json")
    savedp = os.environ.get("SAVED_RESULTS", "/app/followup/saved_raw_results.json")

    data = load_inputs(stage)
    doc_ids = sorted(data["documents"])
    q_ids = sorted(data["queries"])

    with open(savedp, encoding="utf-8") as fh:
        saved = json.load(fh)

    import torch
    from sentence_transformers import SentenceTransformer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[runner] device=%s docs=%d queries=%d" % (device, len(doc_ids), len(q_ids)))

    doc_variants = {
        "raw": [data["documents"][d]["raw"] for d in doc_ids],
        "norm_all_to_latin": [data["documents"][d]["to_latin"] for d in doc_ids],
    }
    q_variants = {
        "raw": [data["queries"][q]["raw"] for q in q_ids],
        "norm_q_to_script": [data["queries"][q]["A_to_script"] for q in q_ids],
        "norm_all_to_latin": [data["queries"][q]["B_to_latin"] for q in q_ids],
    }
    conditions = {
        "raw": ("raw", "raw"),
        "norm_q_to_script": ("norm_q_to_script", "raw"),
        "norm_all_to_latin": ("norm_all_to_latin", "norm_all_to_latin"),
    }

    results = {}
    gate = {}

    for m in MODELS:
        print("[runner] loading %s @ %s" % (m["repo"], m["revision"][:8]))
        model = SentenceTransformer(
            m["repo"], revision=m["revision"],
            trust_remote_code=m["trust_remote_code"], device=device,
        )
        model.max_seq_length = MAXLEN

        def enc(texts):
            return model.encode(texts, batch_size=BATCH, max_length=MAXLEN,
                                convert_to_numpy=True, normalize_embeddings=True,
                                show_progress_bar=False).astype(np.float32)

        for cond, (qk, dk) in conditions.items():
            qi = [m["query_prefix"] + t for t in q_variants[qk]]
            di = [m["passage_prefix"] + t for t in doc_variants[dk]]
            qv = enc(qi)
            dv = enc(di)
            sims = qv @ dv.T
            per_query = {}
            for i, qid in enumerate(q_ids):
                order = np.argsort(-sims[i], kind="stable")[:TOPK]
                per_query[qid] = {
                    "top_ids": [doc_ids[j] for j in order],
                    "top_scores": [round(float(sims[i][j]), 6) for j in order],
                }
            results.setdefault(cond, {})[m["key"]] = per_query
            print("[runner]   %-18s %s done" % (cond, m["key"]))

            if cond == "raw":
                # ---- HARD GATE against the saved original benchmark ----
                ok, bad = True, []
                sv = saved.get(m["key"], {})
                for qid in q_ids:
                    exp = sv.get(qid)
                    if exp is None:
                        continue
                    exp_ids = exp if isinstance(exp, list) else exp.get("top_ids", [])
                    got = per_query[qid]["top_ids"]
                    if list(exp_ids) != list(got):
                        ok = False
                        bad.append(qid)
                gate[m["key"]] = {"ok": ok, "mismatches": bad[:10],
                                 "n_mismatch": len(bad)}
                print("[runner]   GATE %-12s %s (%d mismatches)"
                      % (m["key"], "OK" if ok else "FAIL", len(bad)))

        del model

    payload = {"device": device, "conditions": results, "gate": gate,
               "doc_ids": doc_ids, "query_ids": q_ids,
               "models": {m["key"]: m for m in MODELS}}
    with open(outp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)

    print("[runner] wrote %s" % outp)
    failed = [k for k, v in gate.items() if not v["ok"]]
    if failed:
        sys.exit("HARD GATE FAILED for: %s -- raw condition does not reproduce the "
                 "saved benchmark; normalized results would not be comparable."
                 % ", ".join(failed))
    print("[runner] ALL GATES PASSED")


if __name__ == "__main__":
    main()