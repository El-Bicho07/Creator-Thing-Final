#!/usr/bin/env python3
"""
READ-ONLY export recovery pass for the 2026-10-03 top-3 embedding benchmark.

WHY THIS RE-RUN EXISTS
----------------------
Two required export columns cannot be produced from the saved benchmark outputs:

  1. <model>_top5_scores  -- the original runner saved top5_ids and top5_gains
     (relevance grades) but never persisted the cosine scores.
  2. token_length_per_model in documents.csv -- token counts were never saved.

Everything else in the export is read from the saved JSON artefacts.

This script therefore re-runs ONLY the three primary configurations, under
byte-identical settings, and then HARD-VERIFIES that the reproduced top-5 id
ordering matches the saved top-5 id ordering for all 225 queries. If that gate
fails the export aborts, because the recovered scores would not be trustworthy.

It also runs one clearly-labelled EXTRA experiment (task 6e): Tanglish query ->
Tamil-script document, authored for this pass only.

NOTHING here writes to the database, the vector schema, production config, or
any pre-existing benchmark artefact.
"""

import json
import re
from pathlib import Path

import numpy as np

STAGE = Path("/app/export_stage")
DS = json.loads(Path("/app/docs/eval/embedding_top3_benchmark/dataset.json").read_text(encoding="utf-8"))
SAVED = json.loads(Path("/app/docs/eval/embedding_top3_benchmark/raw_results.json").read_text(encoding="utf-8"))
CFG = json.loads(Path("/app/docs/eval/embedding_top3_benchmark/benchmark_config.json").read_text(encoding="utf-8"))

# primary configurations only (no ablations, no extra Matryoshka dims)
PRIMARY = [("bge_m3", "1024"), ("tamil_embed", "768"), ("e5_base", "768")]

PREFIX = {
    "bge_m3": ("", ""),
    "tamil_embed": ("query: ", "passage: "),
    "e5_base": ("query: ", "passage: "),
}

# ---------------------------------------------------------------------------
# EXTRA EXPERIMENT (task 6e) -- authored for this pass only.
# Latin-script (Tanglish) renderings of the central phrase of 10 Tamil-script
# documents. These are NOT part of the benchmark dataset and are NOT relevance
# labelled by the dataset; the "correct" answer is the source document id.
# ---------------------------------------------------------------------------
TANGLISH_PROBES = [
    ("d_ta_hook_001", "nir ezhuchiyaaga matradhu nambeengungal illa"),
    ("d_ta_hook_002", "naan rendu vediyaagum purdiyaagum theriyavaiyillai"),
    ("d_ta_hook_003", "vanakkum vidhiyaagum theriyavaiyillai"),
    ("d_ta_cap_001", "idhu vanam patinaidu payana indru mela ezhuthukkavum vendum"),
    ("d_ta_cap_002", "aval uthaippu vida padakkum illa"),
    ("d_ta_cap_003", "keezhliyaal keezhliyaal payana indru ezhuthukka vasanam"),
    ("d_ta_scr_001", "moodhu-kattu keezhviyil keezhvaadhu epdi sollanum"),
    ("d_ta_scr_002", "naalu pakutiya vida vaivechchalai"),
    ("d_ta_voice_001", "naan eppadi paaduren nu eppadi than solren"),
    ("d_ta_perf_001", "mutru vandhu mela vilaiya vasai pogakoodu pothu"),
]


def script_of(t):
    if any(0x0B80 <= ord(c) <= 0x0BFF for c in t):
        return "Tamil"
    if any(0x0900 <= ord(c) <= 0x097F for c in t):
        return "Devanagari"
    if re.search(r"[A-Za-z]", t):
        return "Latin"
    return "other"


def main():
    from sentence_transformers import SentenceTransformer

    STAGE.mkdir(parents=True, exist_ok=True)
    docs = DS["documents"]
    queries = DS["queries"]
    doc_texts = [d["text"] for d in docs]
    doc_ids = [d["id"] for d in docs]

    out = {"recovered": {}, "extra_experiment": {}, "config_used": CFG}

    for key, vlabel in PRIMARY:
        print(f"[recover] {key} ...", flush=True)
        m = SentenceTransformer(SAVED[key]["repo"], trust_remote_code=True, device="cpu")
        qp, pp = PREFIX[key]

        # token lengths (documents + queries) using this model's tokenizer
        dl = [len(m.tokenizer.encode(t, add_special_tokens=True)) for t in doc_texts]
        ql = [len(m.tokenizer.encode(qp + q["text"], add_special_tokens=True)) for q in queries]

        D = m.encode([pp + t for t in doc_texts], batch_size=CFG["batch_size"],
                     max_length=CFG["max_seq_length"], convert_to_numpy=True,
                     normalize_embeddings=True, show_progress_bar=False).astype(np.float32)
        Q = m.encode([qp + q["text"] for q in queries], batch_size=CFG["batch_size"],
                     max_length=CFG["max_seq_length"], convert_to_numpy=True,
                     normalize_embeddings=True, show_progress_bar=False).astype(np.float32)

        sims = Q @ D.T
        scores, ids = {}, {}
        for qi, q in enumerate(queries):
            order = np.argsort(-sims[qi], kind="stable")[:5]
            ids[q["id"]] = [doc_ids[j] for j in order]
            scores[q["id"]] = [round(float(sims[qi][j]), 6) for j in order]

        # ---- HARD GATE: reproduced ids must equal saved ids ----
        saved_pq = {p["query_id"]: p for p in SAVED[key]["variants"][vlabel]["per_query"]}
        mismatches = []
        for q in queries:
            if ids[q["id"]] != saved_pq[q["id"]]["top5_ids"]:
                mismatches.append(q["id"])
        if mismatches:
            print(f"[FATAL] {key}: {len(mismatches)} top-5 orderings differ from saved "
                  f"results, e.g. {mismatches[:5]}", flush=True)
            raise SystemExit(1)
        print(f"[gate OK] {key}: all 225 top-5 orderings reproduce exactly", flush=True)

        out["recovered"][key] = {
            "variant": vlabel,
            "dim": int(D.shape[1]),
            "top5_ids": ids,
            "top5_scores": scores,
            "doc_token_lengths": dict(zip(doc_ids, dl)),
            "query_token_lengths": {q["id"]: ql[i] for i, q in enumerate(queries)},
            "reproduces_saved_ordering": True,
        }

        # ---- EXTRA experiment (6e) on this same model ----
        probe_ids = [pid for pid, _ in TANGLISH_PROBES]
        probe_txt = ["query: " + t for _, t in TANGLISH_PROBES] if key != "bge_m3" \
            else [t for _, t in TANGLISH_PROBES]
        P = m.encode(probe_txt, batch_size=CFG["batch_size"],
                     max_length=CFG["max_seq_length"], convert_to_numpy=True,
                     normalize_embeddings=True, show_progress_bar=False).astype(np.float32)
        ps = P @ D.T
        rows = []
        for pi, (pid, txt) in enumerate(TANGLISH_PROBES):
            order = np.argsort(-ps[pi], kind="stable")[:5]
            got = [doc_ids[j] for j in order]
            rank = (got.index(pid) + 1) if pid in got else None
            rows.append({
                "probe_query_id": f"probe_{pi+1:02d}",
                "source_doc_id": pid,
                "source_doc_script": script_of(next(d["text"] for d in docs if d["id"] == pid)),
                "tanglish_query": txt,
                "top5_ids": got,
                "top5_scores": [round(float(ps[pi][j]), 6) for j in order],
                "source_doc_rank": rank,
                "retrieved_in_top5": pid in got,
            })
        out["extra_experiment"][key] = rows
        print(f"[extra] {key}: {sum(1 for r in rows if r['retrieved_in_top5'])}/10 "
              f"Tamil-script sources found in top-5", flush=True)

        del m, D, Q, P, sims, ps
        import gc; gc.collect()

    (STAGE / "recovered.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print("wrote", STAGE / "recovered.json")


if __name__ == "__main__":
    main()
