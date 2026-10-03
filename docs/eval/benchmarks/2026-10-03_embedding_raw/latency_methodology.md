# Latency / Resource / Storage Methodology — 2026-10-03 Embedding Benchmark

Everything below was measured on **one specific machine**, in **one process per
model**, on **CPU**. Read §7 before comparing these numbers to production.

## 1. Hardware and software (measured)

| Property | Value |
|---|---|
| OS | Ubuntu 22.04.5 LTS, kernel 6.8.0-138-generic, glibc 2.41, x86_64 |
| CPU | 12th Gen Intel(R) Core(TM) i5-12450H |
| Physical cores / threads | 8 / 12 |
| RAM | 15 GiB total |
| GPU | NVIDIA GeForce RTX 2050, 4096 MiB — **present, deliberately unused** |
| Device used | CPU, float32 |
| Python | 3.12.15 |
| sentence-transformers / transformers / torch | 3.4.0 / 4.57.6 / 2.14.1+cu130 |

This is a **consumer hybrid laptop**, not a datacentre CPU. Absolute throughput
will not transfer; relative ordering is the usable signal.

## 2. Process isolation
Each model was loaded in its **own subprocess** (`subprocess.run` per candidate)
so that `peak_rss_mb` is attributable to exactly one model and is not polluted by
a previously-loaded model still resident in memory. Wall-clock for the whole
subprocess is recorded separately as `subprocess_wall_seconds` in
`saved_outputs/raw_results.json`.

## 3. Warm-up
Before any timing, each model was given an explicit warm-up call:

```python
enc(["warmup text one", "warmup text two", "warmup text three"])
```

This is **3 short English strings**, which is a weak warm-up for a
multilingual tokenizer and is a **methodological weakness**: first-call cost for
Tamil/Devanagari inputs may include lazily-initialised subword segmenter paths.
See §7.

## 4. Cold vs warm

| Metric | What was measured | n |
|---|---|---:|
| **Model load** | `SentenceTransformer(...)` construction, from just before the call to just after | 1 per model |
| **Cold first batch** | First `encode()` of a real 16-document batch after load, after the 3-string warm-up. Reported as the first of 3 samples. | 3 samples |
| **Warm single query** | `encode([one_query])` repeated | **40** |
| **Warm batch** | `encode(all 113 documents)` repeated | **10** |

Cold samples, ms:
`bge_m3` [1833.7, 1787.9, 1796.1] · `tamil_embed` [550.8, 516.2, 509.9] ·
`e5_base` [542.4, 508.5, 509.3]

The cold figure is dominated by first-call kernel/library setup, not by
inference. It is roughly **20× warm** for the 278M models and **20× warm** for
BGE-M3's larger batch.

## 5. Latency results (measured)

Single-query latency — one query string at a time, `batch_size=16` passed but
only one item in the list:

| Model | mean | p50 | **p95** | p99 | n |
|---|---:|---:|---:|---:|---:|
| `bge_m3` | 84.04 ms | 83.82 ms | **88.25 ms** | 90.60 ms | 40 |
| `tamil_embed` | 33.62 ms | 33.48 ms | **33.91 ms** | 40.03 ms | 40 |
| `e5_base` | 33.65 ms | 33.32 ms | **34.49 ms** | 40.46 ms | 40 |

Batch latency — all 113 documents in one call, `batch_size=16`:

| Model | mean | p50 | **p95** | p99 | n |
|---|---:|---:|---:|---:|---:|
| `bge_m3` | 11212 ms | 11203 ms | **11326 ms** | 11359 ms | 10 |
| `tamil_embed` | 3249 ms | 3231 ms | **3392 ms** | 3463 ms | 10 |
| `e5_base` | 3264 ms | 3251 ms | **3373 ms** | 3402 ms | 10 |

**Percentiles are computed over the raw sample list** as
`sorted[(len-1)*p]` with linear interpolation between neighbours — i.e. a
nearest-rank/interpolated percentile over 40 (single) or 10 (batch) samples.
With n=10 a "p95" is effectively the maximum; **treat batch p95/p99 as
"worst of 10", not as a true tail percentile.** The saved JSON also carries
`min_ms` and `max_ms` so this can be re-derived.

## 6. Throughput (measured, derived from one timed call each)

| Model | documents/s | queries/s | basis |
|---|---:|---:|---|
| `bge_m3` | **9.96** | 19.96 | one timed `encode()` of 113 docs / 225 queries |
| `tamil_embed` | **34.80** | 58.38 | same |
| `e5_base` | **34.69** | 58.79 | same |

Throughput is `count / elapsed` from a **single** timed call per quantity, not a
median over repeats, so it is noisier than the latency percentiles.

Implied 1,000,000-document backfill at these rates, single worker: **≈8.0 h**
for the 278M models, **≈27.8 h** for BGE-M3. These are linear extrapolations
(calculated, not measured) and ignore retries, I/O and database writes.

## 7. RAM (measured)

| Model | steady RSS after load+encode | peak RSS | method |
|---|---:|---:|---|
| `bge_m3` | 2375.0 MB | 2373.5 MB | `psutil.Process().memory_info().rss`; peak from `resource.getrusage(RUSAGE_SELF).ru_maxrss` |
| `tamil_embed` | 1535.1 MB | 1533.6 MB | same |
| `e5_base` | 1542.0 MB | 1540.4 MB | same |

Note peak is marginally *below* steady: `ru_maxrss` is a high-water mark sampled at
different points and the steady reading is taken after both document and query
matrices are resident. Both include the full embedding matrices
(113×dim and 225×dim float32), which is negligible (<2 MB).

**CPU utilisation was not measured.** The earlier exploratory script sampled
`psutil` CPU percent and reported values around 780% for 8 physical cores, but
that figure came from a *superseded* exploratory run against different models on
a differently-loaded machine and **is not reproduced in this export**. Treated as
UNKNOWN.

## 8. Disk size (measured)
Sum of bytes of `*.json`, `*.txt`, `*.model`, `*.safetensors` in the resolved
Hugging Face snapshot directory:

| Model | disk |
|---|---:|
| `tamil_embed` | 1077.0 MB |
| `e5_base` | 1103.1 MB |
| `bge_m3` | 2208.2 MB |

Restricted to those four suffixes, so tokenizer files or other assets outside the
pattern would be excluded. Treat as an upper bound on the model payload and a
good estimate of download size.

## 9. Storage per 1M vectors — **CALCULATED, NOT MEASURED**

Formula: `dim × 4 bytes × 1,000,000`, then bytes → MB using 1024².

| Config | dim | bytes/vector | MB / 1M vectors | vs 768 |
|---|---:|---:|---:|---:|
| `tamil_embed` @768 | 768 | 3072 | 2930 MB | 1.000 |
| `tamil_embed` @512 | 512 | 2048 | 1953 MB | 0.667 |
| `tamil_embed` @256 | 256 | 1024 | 977 MB | 0.333 |
| `e5_base` @768 | 768 | 3072 | 2930 MB | 1.000 |
| `bge_m3` @1024 | 1024 | 4096 | 3906 MB | 1.333 |
| *(current production `vector(384)`)* | 384 | 1536 | *1465 MB* | *0.500* |

**These are raw vector bytes only.** They exclude:
* pgvector HNSW/IVFFlat index overhead (typically +10–40% depending on `m`/`ef_construction`);
* row overhead, TOAST, per-chunk `chunk_text`;
* WAL, replicas, backups.

So a real deployment will be materially larger than the table. No pgvector index
was created at any point in this benchmark — the retrieval index was in-memory
numpy only.

## 10. What is measured vs calculated

| Figure | Status |
|---|---|
| model load seconds | measured, n=1 |
| cold first-batch latency | measured, n=3 |
| single-query mean/p50/p95/p99 | **measured**, n=40 |
| batch mean/p50/p95/p99 | **measured**, n=10 (p95 ≈ max) |
| documents/s, queries/s | measured from 1 timed call each |
| steady RSS, peak RSS | measured |
| CPU utilisation | **UNKNOWN — not measured in this benchmark** |
| disk download size | measured (4 file-suffix pattern) |
| MB per 1M vectors | **calculated** |
| 1M-document backfill hours | **calculated** (linear extrapolation) |
