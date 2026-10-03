# Reproduction — 2026-10-03 Embedding Benchmark Export

## 1. Code provenance

| Item | Value |
|---|---|
| Git commit at export time | `ff808ab15dc76256e0481fde4a54e8cb012a49dd` |
| Commit subject | `Import all branches as modules (cleaned)` |
| Benchmark code paths | `scripts/top3_benchmark/` |
| Dataset builder | `scripts/top3_benchmark/build_dataset.py` |
| Dataset content modules | `dataset_documents.py`, `dataset_documents_ta_hi.py`, `dataset_documents_mixed.py`, `dataset_queries_a.py`, `dataset_queries_b.py` |
| Benchmark runner | `scripts/top3_benchmark/run_benchmark.py` |
| Aggregator | `scripts/top3_benchmark/aggregate_results.py` |
| Export recovery pass | `scripts/top3_benchmark/export_recover.py` |
| Export assembler | `scripts/top3_benchmark/export_assemble.py` |

**Important:** the benchmark code is **uncommitted** at this SHA (it is part of
the untracked `scripts/` tree). The commit hash identifies the repository state
(donor `modules/` import), **not** a frozen copy of the benchmark scripts. To
reproduce exactly, use the scripts as they exist in the working tree.

## 2. Environment

```
OS        Ubuntu 22.04.5 LTS
kernel    6.8.0-138-generic
CPU       12th Gen Intel(R) Core(TM) i5-12450H  (8 physical cores / 12 threads)
RAM       15 GiB
GPU       NVIDIA GeForce RTX 2050 (4096 MiB) — PRESENT BUT UNUSED
Python    3.12.15
device    cpu, float32
```

Key package versions (full list in `pip_freeze.txt`, 135 lines):

```
torch==2.14.1
transformers==4.57.6
sentence-transformers==3.4.0
tokenizers==0.22.2
huggingface_hub==0.36.2
numpy==1.26.4
safetensors==0.8.0
scipy==1.17.1
```

> **Correction.** `benchmark_report.md` §3 lists `numpy 2.5.3`. That is
> **wrong** — it was carried over from Module 19's `requirements.txt` by mistake.
> The machine-generated `saved_outputs/environment.json` recorded
> `numpy 1.26.4`, which `pip_freeze.txt` confirms. **1.26.4 is correct.**
> The pre-existing report was left unmodified as instructed; this note records
> the discrepancy.

## 3. Pinned model revisions

```
Tamil-ai/tamil-embed-base     a5b5aa23a0a7eee1e7eccee53c5835c6e68b06ce
intfloat/multilingual-e5-base d128750597153bb5987e10b1c3493a34e5a4502a
BAAI/bge-m3                   5617a9f61b028005a4858fdac845db406aefb181
```

## 4. Random seeds

| Seed | Value | Actually used? |
|---|---|---|
| Dataset seed (recorded in `dataset.json`) | `20260303` | **No — inert.** No sampling occurs anywhere; the value is provenance metadata only. |
| Model / inference seed | **not set** | Inference is deterministic; no seeding required or performed. |
| `np.argsort` | n/a | `kind="stable"` gives deterministic tie-breaking. |

Re-running with the same inputs reproduces identical rankings (demonstrated by
the recovery pass, §6).

## 5. Exact commands

All runs executed inside the running API container, which mounts
`apps/api` at `/app`.

### 5.1 Build the dataset and run integrity checks (host)
```bash
python3 scripts/top3_benchmark/build_dataset.py
# -> docs/eval/embedding_top3_benchmark/dataset.json
# -> docs/eval/embedding_top3_benchmark/integrity_report.json
# exits non-zero if any hard check fails
```

### 5.2 Sync into the container
```bash
docker exec creator-api mkdir -p /app/top3 /app/docs/eval/embedding_top3_benchmark
docker cp scripts/top3_benchmark/. creator-api:/app/top3/
docker cp docs/eval/embedding_top3_benchmark/dataset.json \
  creator-api:/app/docs/eval/embedding_top3_benchmark/
```

### 5.3 Run the benchmark (primary + ablations)
```bash
# all five configurations, one isolated subprocess each
docker exec -e TOP3_ROOT=/app \
            -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
            -w /app/top3 creator-api python run_benchmark.py

# or individually
docker exec -e TOP3_ROOT=/app \
            -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
            -w /app/top3 creator-api python run_benchmark.py --only tamil_embed
docker exec -e TOP3_ROOT=/app \
            -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
            -w /app/top3 creator-api python run_benchmark.py --only e5_base
docker exec -e TOP3_ROOT=/app \
            -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
            -w /app/top3 creator-api python run_benchmark.py --only bge_m3
docker exec -e TOP3_ROOT=/app \
            -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
            -w /app/top3 creator-api \
            python run_benchmark.py --only e5_base_nopfx_ABLATION,tamil_embed_nopfx_ABLATION
```

`TOP3_ROOT`/`TOP3_OUT` override the repo-relative paths, because inside the
container `parents[2]` resolves to `/`.

### 5.4 Aggregate (host)
```bash
docker cp creator-api:/app/docs/eval/embedding_top3_benchmark/_raw_partial.json \
  docs/eval/embedding_top3_benchmark/raw_results.json
python3 scripts/top3_benchmark/aggregate_results.py
```

### 5.5 Export recovery pass (this export)
Required because `top5_scores` and per-model token lengths were never persisted
by the original runner.

```bash
docker exec creator-api mkdir -p /app/export_stage
docker cp scripts/top3_benchmark/export_recover.py creator-api:/app/top3/
docker exec -w /app/top3 creator-api python export_recover.py
# HARD GATE: aborts unless all 225 top-5 orderings reproduce per model
docker cp creator-api:/app/export_stage/recovered.json /tmp/exportstage/recovered.json
python3 scripts/top3_benchmark/export_assemble.py
```

## 6. Why the recovered scores can be trusted

`export_recover.py` re-encodes the corpus and queries under **byte-identical
settings** (same repo ids, same prefixes, `max_length=512`, `batch_size=16`,
`normalize_embeddings=True`) and then asserts that the reproduced top-5 **id
ordering** equals the ordering saved by the original run, for **all 225 queries**,
for **each of the three models**. Any mismatch aborts the export.

Observed:

```
[gate OK] bge_m3:       all 225 top-5 orderings reproduce exactly
[gate OK] tamil_embed:  all 225 top-5 orderings reproduce exactly
[gate OK] e5_base:     all 225 top-5 orderings reproduce exactly
```

Therefore the scores in `per_query_results.csv` are the scores of the run that
produced the saved results. This also demonstrates the pipeline is deterministic
on this hardware.

## 7. What was re-run vs saved

| Deliverable element | Source |
|---|---|
| top-5 **ids**, `first_relevant_rank`, hit@1/3/5 | **Saved** original run |
| all aggregate metrics (R@k, MRR, nDCG, slices) | **Saved** original run |
| latency, RAM, disk, throughput | **Saved** original run |
| top-5 **scores** | **Re-run** (recovery pass, gate-verified) |
| `token_length_*_per_model` | **Re-run** (recovery pass) |
| `extra_experiment_tanglish_probes.csv` | **New experiment**, authored for this export |

Nothing else was recomputed.

## 8. Sanity re-derivation of the CSV
```bash
python3 - <<'PY'
import csv
rows=[r for r in csv.DictReader(open('per_query_results.csv',encoding='utf-8'))
      if r['condition']=='documented_prefixes']
bad=0
for r in rows:
    rel=set(r['relevant_doc_ids'].split('|'))
    for m in ['bge_m3','tamil_embed','e5_base']:
        top=r[m+'_top5_ids'].split('|')
        rk='' if not any(d in rel for d in top) else top.index(next(d for d in top if d in rel))+1
        if (str(r[m+'_first_relevant_rank'])!=str(rk)
            or int(r[m+'_hit_at_1'])!=int(top[0] in rel)
            or int(r[m+'_hit_at_3'])!=int(any(d in rel for d in top[:3]))
            or int(r[m+'_hit_at_5'])!=int(any(d in rel for d in top[:5]))): bad+=1
print('rows disagreeing with recomputation:',bad)   # -> 0
PY
```
