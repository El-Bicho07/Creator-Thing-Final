# Reproducibility — Embedding Follow-up Evaluation

## 1. Code provenance

| Item | Value |
|---|---|
| Git commit at run time | `e605ec1204a3c1a4255b4229e46ea19b41844ef4` |
| Commit subject | `docs(eval): export raw materials for 2026-10-03 embedding benchmark` |
| Source of corpus/results | `docs/eval/benchmarks/2026-10-03_embedding_raw/` (read-only, commit `e605ec1`) |

Follow-up scripts (this evaluation):

| Script | Role | Runs on |
|---|---|---|
| `scripts/benchmark_followup/requirements-normalize.txt` | pinned NORMALIZATION TOOL deps | host |
| `scripts/benchmark_followup/make_validation_sample.py` | Part A deterministic sample | host |
| `scripts/benchmark_followup/normalize.py` | transliteration stage | host venv |
| `scripts/benchmark_followup/run_retrieval.py` | embedding + retrieval | **in container** |
| `scripts/benchmark_followup/analyze_followup.py` | all metrics + statistics (Part M) | host, stdlib only |

> Like the original benchmark, the scripts under `scripts/` are uncommitted at
> this SHA. The hash identifies the repository state, not a frozen copy of the
> scripts. Use the working-tree versions.

## 2. Environment

```
OS        Ubuntu 22.04.5 LTS
kernel    6.8.0-138-generic
CPU       12th Gen Intel Core i5-12450H (8 physical / 12 threads)
RAM       15 GiB
GPU       NVIDIA RTX 2050 (4 GB) — PRESENT BUT UNUSED (CPU-first design)
Python    3.10.12 (host, normalization + analysis)
Python    3.12.15 (container, embedding)
device    cpu, float32
```

### Normalization tool (host, isolated venv)
```
indic-transliteration  2.3.75
backports.functools-lru-cache 2.0.0
regex   2026.9.29
roman   5.2
toml    0.10.2
typer   0.27.2
```
Pinned in `scripts/benchmark_followup/requirements-normalize.txt`.

### Embedding stack (container `creator-api`, unchanged)
```
sentence-transformers 3.4.0
transformers          4.57.6
torch                 2.14.1+cu130
tokenizers            0.22.2
numpy                 1.26.4
```

## 3. Random seeds

| Seed | Value | Where |
|---|---|---|
| Validation sample | `20261003` | `random.Random(seed).sample(sorted_pool, 15)` |
| Bootstrap resampling | `20261003` | `analyze_followup.py` |
| Permutation test | `20261003` | sign-flip, 10 000 perms |
| Dataset generation seed (`20260303`) | **inert** | no sampling anywhere; provenance metadata only |
| Model / inference seed | **not set** | inference is deterministic |

No sampling occurs in retrieval. Tie-breaking is `numpy.argsort(kind="stable")`.

Determinism of the sample was confirmed empirically: running
`make_validation_sample.py` twice produced an identical file SHA-256
(`b08ec7d4b338637dbd15cd8bf4d7a55dc286082ceb5a931cc1ae609c7252c6a1`).

## 4. Exact commands

### 4.1 Part A — validation sample
```bash
python3 scripts/benchmark_followup/make_validation_sample.py
```

### 4.2 Normalization tool (host, isolated — never inside the API container)
```bash
python3 -m venv /tmp/followup_norm_venv
/tmp/followup_norm_venv/bin/pip install -r scripts/benchmark_followup/requirements-normalize.txt
/tmp/followup_norm_venv/bin/python scripts/benchmark_followup/normalize.py
# -> docs/eval/benchmarks/benchmark_followup/normalized_inputs.json
```

### 4.3 Embedding + retrieval (inside the running container)
```bash
docker exec creator-api mkdir -p /app/followup
docker cp docs/eval/benchmarks/benchmark_followup/normalized_inputs.json creator-api:/app/followup/
# saved_results.json is raw_results.json flattened to {model: {query_id: [top5 ids]}}
docker cp /tmp/saved_raw_results.json creator-api:/app/followup/saved_raw_results.json
docker cp scripts/benchmark_followup/run_retrieval.py creator-api:/app/followup/

docker exec -e FOLLOWUP_IN=/app/followup/normalized_inputs.json \
            -e FOLLOWUP_OUT=/app/followup/raw_retrieval.json \
            -e SAVED_RESULTS=/app/followup/saved_raw_results.json \
            creator-api python /app/followup/run_retrieval.py

docker cp creator-api:/app/followup/raw_retrieval.json \
  docs/eval/benchmarks/benchmark_followup/raw_retrieval.json
```

Wall time on CPU: **~5 minutes** for 3 models × 3 conditions (bge-m3 at 512
tokens dominates). Output is buffered, so `--verify`-style log lines may not
appear until the process exits; the JSON payload is written last and is the
authoritative artefact.

The script exits non-zero if the hard gate fails.

### 4.4 Analysis (host, standard library only)
```bash
python3 scripts/benchmark_followup/analyze_followup.py            # regenerate
python3 scripts/benchmark_followup/analyze_followup.py --verify    # prove reproducibility
```
Runtime ≈ 60 s (72 paired comparisons × 10 000 bootstrap + 10 000 permutations).

## 5. Hard gate (validity precondition)

`run_retrieval.py` re-runs the `raw` condition and aborts unless **all 225 top-5
id orderings match the saved original benchmark for all three models**:

```
bge_m3        ok=True   mismatches=0
tamil_embed   ok=True   mismatches=0
e5_base       ok=True   mismatches=0
```

The raw condition also reproduces the published headline metrics exactly
(0.711/0.651, 0.689/0.588, 0.671/0.607). Because the baseline is exact, all
raw-vs-normalized differences are attributable to the text transformation alone.
`analyze_followup.py` re-checks this gate on every run and aborts if it fails.

## 6. Reproducibility proof

```
$ python3 scripts/benchmark_followup/analyze_followup.py --verify
   normalized_results.csv       IDENTICAL
   cross_script_results.csv     IDENTICAL
   tanglish_12_analysis.csv     IDENTICAL
   statistics.json              IDENTICAL
[analyze] VERIFY OK: all 4 artefacts reproduced byte-for-byte
```

Verified by deleting all four outputs and regenerating from
`raw_retrieval.json` + `normalized_inputs.json`. `--verify` regenerates into a
temporary directory and compares bytes.

`analyze_followup.py` imports **only** `argparse`, `csv`, `json`, `math`,
`os`, `random`, `sys`, `shutil`, `tempfile` — all standard library. No network
access, no credentials, no `.env` reads.

## 7. Environment caveats observed

* **`/tmp` is not durable on this host.** Both the venv and the staging
  directory were cleaned up mid-session. That is why the normalization
  dependencies are pinned into the repository rather than left in `/tmp`.
* The Docker stack (`creator-api`, `creator-web`, `creator-postgres`) was shut
  down cleanly (`exit 0`, `OOMKilled=false`) partway through the retrieval run,
  after the output payload had been written. The run had already completed all
  27 encode passes and passed every gate; only the buffered stdout was lost.
  This was **not** caused by this evaluation.
* `creator-api` must be running for step 4.3. Restart the stack first if it is
  down.

## 8. Determinism caveat for re-execution

The retrieval stage re-encodes the corpus, so it depends on the exact pinned
library versions above. Floating-point differences across BLAS builds or torch
versions could in principle reorder near-tied top-5 neighbours. The `raw` gate
exists precisely to detect this: if it passes, results are comparable; if it
fails, treat the numbers as non-comparable rather than adjusting them.