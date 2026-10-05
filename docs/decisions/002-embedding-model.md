# Embedding Model Decision — Creator Platform SaaS

*Architecture Decision Record: ADR-002*

## Status

**SUPERSEDED IN PART — RE-EVALUATED 2026-10-03**

This ADR originally selected `intfloat/multilingual-e5-small`. That selection has
been **re-evaluated by a larger, leakage-checked benchmark** against three
stronger candidates. Sections 1–11 are preserved unmodified as the historical
record of the original decision. Section 12 records the re-evaluation.

> **Do not read sections 1–11 as the current recommendation.**
> See §12 and `docs/eval/embedding_top3_benchmark/benchmark_report.md`.

---

## Historical Record (Sections 1–11 — Original Decision)

The original decision was `intfloat/multilingual-e5-small`, validated on a
36-document / 15-query benchmark against `all-MiniLM-L6-v2`,
`all-mpnet-base-v2` and `BAAI/bge-small-en-v1.5`. That benchmark:

- was English-heavy and had **insufficient code-mixed coverage**;
- was never leakage-checked;
- inferred a "no E5 prefixes" convention from a single similarity pair.

All three limitations are addressed by the re-evaluation in §12.

---

## 1. Benchmark Dataset Validation

### Dataset Composition

| Metric | Value |
|--------|-------|
| **Total Documents** | 36 |
| **Total Queries** | 15 |

### Language Distribution (Corpus)

| Language | Document Count | Percentage |
|----------|----------------|------------|
| English | 24 | 67% |
| Tamil | 7 | 19% |
| Hindi | 2 | 6% |
| Tanglish | 1 | 3% |
| Hinglish | 2 | 6% |

### Language Distribution (Queries)

| Language | Query Count | Percentage |
|----------|-------------|------------|
| English | 7 | 47% |
| Tamil | 3 | 20% |
| Hindi | 2 | 13% |
| Tanglish | 1 | 7% |
| Hinglish | 2 | 13% |

### Content Types (Corpus)

| Type | Count |
|------|-------|
| post | 15 |
| caption | 4 |
| hook | 4 |
| script | 2 |
| idea | 3 |
| note | 2 |
| strategy | 2 |
| audience | 2 |
| performance | 2 |

### Expected Relevance Labels

Every query has explicitly defined expected relevant document IDs (1-3 per query). The evaluation uses Top-3 Recall and MRR against these ground-truth labels.

---

## 2. Code-Mixed Coverage Assessment

**CODE-MIXED COVERAGE INSUFFICIENT**

| Metric | Count | Notes |
|--------|-------|-------|
| Corpus Tanglish docs | 1 | Single post |
| Corpus Hinglish docs | 2 | Two posts |
| Queries Tanglish | 1 | Single query |
| Queries Hinglish | 2 | Two queries |

**Assessment**: The code-mixed evaluation is extremely limited (3 documents, 3 queries). The 1.0 recall on Tanglish/Hinglish queries is likely due to English token overlap (e.g., "Next.js", "SaaS", "React", "PostgreSQL") rather than true code-mixed semantic understanding. Production code-mixed performance is **not validated** by this benchmark.

---

## 3. Retrieval Quality (Validated)

### Overall Metrics (Top-3 Recall, MRR)

| Model | Top-3 Recall | MRR | English Recall | Tamil Recall | Hindi Recall | Tanglish Recall | Hinglish Recall |
|-------|--------------|-----|----------------|--------------|--------------|-----------------|-----------------|
| **intfloat/multilingual-e5-small** | **0.567** | **0.933** | 0.50 | **0.67** | 0.50 | 1.00* | 0.50 |
| BAAI/bge-small-en-v1.5 | 0.533 | 0.900 | 0.45 | 0.50 | 0.50 | 1.00* | 0.67* |
| all-MiniLM-L6-v2 | 0.544 | 0.822 | 0.48 | 0.50 | 0.50 | 1.00* | 0.67* |
| all-mpnet-base-v2 | 0.511 | 0.767 | 0.55 | 0.17 | 0.50 | 1.00* | 0.67* |

\* Code-mixed results based on only 3 queries with high English token overlap.

### Key Findings

1. **Multilingual Advantage**: `intfloat/multilingual-e5-small` achieves **0.67 Tamil recall** vs 0.50 for other models — a meaningful improvement for the target creator demographic.

2. **MRR Leadership**: **0.933 MRR** is highest, indicating relevant results appear at rank 1 more often.

3. **Code-Mixed Caveat**: The 1.0 recall on Tanglish/Hinglish is an artifact of limited test data with heavy English token overlap (technical terms like "Next.js", "React", "PostgreSQL"). Not a reliable indicator of true code-mixed performance.

3. **English Performance**: All models perform similarly on English (~0.45-0.55 recall).

---

## 4. Latency Validation (Controlled Measurements)

### Measurement Methodology

- **Cold latency**: First inference after model load (no warmup)
- **Warm latency**: 20 runs after 3 warmup iterations, batch size = 15 texts
- **Single latency**: 100 runs, single text
- **Hardware**: CPU-only (no GPU), 8 vCPU container

### Batch Latency (15 texts)

| Model | Cold (ms) | Warm Mean (ms) | Warm p50 (ms) | Warm p95 (ms) | Warm p99 (ms) |
|-------|-----------|----------------|---------------|---------------|---------------|
| **intfloat/multilingual-e5-small** | 99.9 | 79.2 | 78.7 | **93.1** | 93.1 |
| all-MiniLM-L6-v2 | 62.5 | 57.3 | 57.1 | 60.9 | 60.9 |
| BAAI/bge-small-en-v1.5 | 76.5 | 76.0 | 73.9 | 84.8 | 84.8 |

### Single-Text Latency

| Model | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|-------|-----------|----------|----------|----------|
| intfloat/multilingual-e5-small | 11.4 | 11.4 | 14.7 | 14.7 |
| all-MiniLM-L6-v2 | 6.9 | 6.9 | 8.5 | 8.5 |
| BAAI/bge-small-en-v1.5 | 5.9 | 5.9 | 6.6 | 6.6 |

### Latency Target Assessment

| Target | intfloat/multilingual-e5-small | all-MiniLM-L6-v2 | BAAI/bge-small-en-v1.5 |
|--------|-------------------------------|------------------|------------------------|
| **Batch p95 < 150ms** | ✅ **MET** (93.1ms) | ✅ MET (60.9ms) | ✅ MET (84.8ms) |
| **Batch mean < 150ms** | ✅ **MET** (79.2ms) | ✅ MET (57.3ms) | ✅ MET (76.0ms) |

**LATENCY TARGET: MET** for all candidates under controlled warm-inference conditions.

> **Important**: Earlier benchmark runs reported ~239ms for intfloat/multilingual-e5-small due to different measurement methodology (fewer warmup runs, different batch sizing). Under controlled warm-inference with proper warmup, all models meet the <150ms target.

---

## 5. Resource Utilization (Validated)

| Model | CPU Usage (mean) | Memory (MB) | Throughput (texts/sec) | Parameters |
|-------|------------------|-------------|------------------------|------------|
| intfloat/multilingual-e5-small | 780% (8 vCPU) | 1,203 MB | 171 texts/sec | 33.4M |
| all-MiniLM-L6-v2 | 783% (8 vCPU) | 1,145 MB | 224 texts/sec | 22.7M |
| BAAI/bge-small-en-v1.5 | 785% (8 vCPU) | 1,130 MB | 174 texts/sec | N/A (fastembed) |

**Observations**:
- All models saturate available CPU cores (8 vCPU = ~800% max)
- Memory usage: 1.1-1.2 GB RSS per model
- Throughput: 171-224 texts/sec (batch of 15)
- intfloat/multilingual-e5-small is ~30% slower than all-MiniLM-L6-v2 but still provides 171 texts/sec throughput

---

## 5. E5 Usage Convention Validation

### Query/Passage Prefix Convention Test

For `intfloat/multilingual-e5-small`:

| Encoding | Similarity (query vs passage) |
|----------|-------------------------------|
| No prefix | 0.898 |
| With `query:` / `passage:` prefix | 0.854 |

**Finding**: The model **does not benefit** from explicit `query:` / `passage:` prefixes — similarity actually decreases with prefixes (0.898 → 0.854). This indicates:

1. `sentence-transformers` does **NOT** automatically apply E5 query/passage prefixes for this model
2. The model appears fine-tuned without requiring explicit query/passage prefixes
3. Adding manual prefixes actually degrades retrieval quality

**Production Convention**: Use the model **without manual prefixes** through `sentence-transformers`. Do NOT add `query:` or `passage:` prefixes — they degrade retrieval quality. The model expects raw text input.

---

## 6. Vector Architecture Confirmation

Regardless of selected model:

```
Creator Voice Engine
        +
Long-Term Memory Engine
        ↓
Unified Creator Intelligence
        ↓
PostgreSQL + pgvector (384 dimensions)
```

**Migration Required**:
- Module 13 embeddings (all-MiniLM-L6-v2 / hash fallback) → **FULL RE-EMBED**
- Module 19 embeddings (BAAI/bge-small-en-v1.5) → **FULL RE-EMBED**
- Future imports → embed with `intfloat/multilingual-e5-small`

Storage: 384-dim float32 = 1.5 KB/vector → ~1.5 GB per 1M chunks

---

## 7. Comparative Trade-off Summary

| Criterion | intfloat/multilingual-e5-small | all-MiniLM-L6-v2 | BAAI/bge-small-en-v1.5 |
|-----------|-------------------------------|------------------|------------------------|
| **Tamil Recall** | **0.67** ✅ | 0.50 | 0.50 |
| **Hindi Recall** | 0.50 | 0.50 | 0.50 |
| **Code-Mixed** | 1.00* (unreliable) | 1.00* | 1.00* |
| **MRR** | **0.933** ✅ | 0.822 | 0.900 |
| **Batch p95 Latency** | 93ms ✅ | **61ms** ✅ | 85ms ✅ |
| **Throughput** | 171/s | **224/s** ✅ | 174/s |
| **Memory** | 1,203 MB | **1,145 MB** ✅ | 1,130 MB ✅ |
| **Code-Mixed Validity** | ❌ Not validated | ❌ Not validated | ❌ Not validated |

---

## 8. Known Limitations & Caveats

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Code-mixed validation insufficient** | Production Tamil/English/Hindi mixing untested | Post-launch monitoring; expand test set |
| **Dataset small (36 docs, 15 queries)** | Recall/MRR not statistically significant | Expand to 200+ docs, 50+ queries for production |
| **Latency varies by hardware** | Container CPU may differ from production | Benchmark on target production hardware |
| **E5 prefix behavior** | Library handles internally | Document convention; test with production data |
| **CPU saturation** | All models saturate 8 cores | Plan for GPU or async batching in production |

---

## 9. Final Decision

### Recommendation

**MODEL SELECTION: `intfloat/multilingual-e5-small`**

**Rationale**:
1. **Superior multilingual quality**: Only model with >0.5 Tamil recall (0.67)
2. **Highest MRR (0.933)**: Relevant results at rank 1 most consistently
2. **Meets latency target**: p95 = 93ms < 150ms threshold
3. **Native multilingual support**: 100+ languages including Tamil/Hindi
3. **No external API**: Local CPU inference, no API keys

**Trade-offs Accepted**:
- ~30% slower than all-MiniLM-L6-v2 (still under 150ms target)
- ~5% more memory usage
- Code-mixed performance unvalidated — requires post-launch monitoring

---

## 10. Migration Strategy (If Approved)

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Add `embedding_model_version` column to `chunks` table | Phase 2 start |
| 2 | Implement re-embedding pipeline in `apps/api/app/memory/embeddings.py` | Phase 2 |
| 3 | Batch re-embed Module 13 & 19 data via background jobs | Phase 2 |
| 4 | Validate post-migration retrieval quality | Phase 2 end |
| 5 | Atomic model version swap | Phase 2 end |
| 6 | Rollback: revert `embedding_model_version` filter | If needed |

---

## 10. Decision Status

> **EMBEDDING MODEL: VALIDATED — PENDING EXPLICIT APPROVAL**

The evidence supports `intfloat/multilingual-e5-small` as the best choice for the Creator Platform's multilingual requirements. All technical gates (latency, retrieval quality, resource usage, E5 convention) are satisfied.

**Remaining gate**: Explicit stakeholder approval of the trade-off: **~30% slower inference for significantly better Tamil retrieval (0.67 vs 0.50)**.

> **PHASE 2 STATUS: TECHNICALLY READY — EMBEDDING MODEL VALIDATED — WAITING FOR EXPLICIT APPROVAL**

---

## 11. Files Updated

- `docs/decisions/002-embedding-model.md` ← This document (updated with validated findings)
- `docs/eval/embedding_benchmark_results.json` ← Original benchmark results
- `docs/eval/detailed_latency_results.json` ← Detailed latency/resource validation
- `docs/eval/llm_gateway_contract_validation.md` ← LLM gateway contract validation
- `docs/decisions/006-provider-strategy.md` ← Provider strategy documentation
- `docs/decisions/007-deployment-target.md` ← Deployment target dependencies
- `docs/PHASE_2_READINESS.md` ← Final readiness assessment
---

# 12. Re-Evaluation (2026-10-03) — Top-3 Benchmark

Added after the original decision in §1–11. The original sections are left
untouched so the historical record stays accurate.

## 12.1 Why the decision was re-opened

The original evidence base had three defects:

| Defect in original benchmark | Consequence |
|---|---|
| 36 documents / 15 queries, English-heavy | Too small and skewed to justify a platform-wide decision |
| Code-mixed coverage **insufficient** (3 docs, 3 queries) | Tanglish/Hinglish behaviour was effectively unmeasured |
| Never leakage-checked; "no prefix" inferred from one similarity pair | Convention conclusion not supported by retrieval metrics |

Additionally, `intfloat/multilingual-e5-small` was never compared against the
larger base-class models or the Tamil-specialised model.

## 12.2 Candidates re-evaluated

| Candidate | Dims | Commit |
|---|---|---|
| `Tamil-ai/tamil-embed-base` | 768 / 512 / 256 | `a5b5aa23a0a7eee…` |
| `intfloat/multilingual-e5-base` | 768 | `d128750597153bb5…` |
| `BAAI/bge-m3` | 1024 (dense only) | `5617a9f61b028005…` |

Dataset: 113 documents, 225 queries, 256 relevant pairs, 16 phenomena,
SHA256/16 `e24337b5380674b0`. Integrity-checked; **15 verbatim leakages were
detected and removed before any model ran.**

## 12.3 Results (dense, cosine, 225 queries)

| Model | Dim | R@1 | R@3 | R@5 | MRR | nDCG@5 |
|---|---:|---:|---:|---:|---:|---:|
| `BAAI/bge-m3` | 1024 | **0.578** | **0.711** | **0.773** | **0.651** | **0.723** |
| `Tamil-ai/tamil-embed-base` | 768 | 0.484 | 0.689 | 0.751 | 0.588 | 0.664 |
| `intfloat/multilingual-e5-base` | 768 | 0.538 | 0.671 | 0.729 | 0.607 | 0.679 |

Retrieval by **target-document script** (the fairest "can it find Tamil/Hindi?"):

| Target script | n | tamil-embed | e5-base | bge-m3 |
|---|---:|---:|---:|---:|
| Latin | 153 | 0.804 | 0.778 | 0.797 |
| Tamil | 57 | 0.474 | 0.509 | **0.579** |
| Devanagari | 46 | 0.652 | 0.587 | **0.717** |

## 12.4 Findings that change the picture

1. **The Tamil-specialised model is worst on Tamil-script retrieval** (0.474).
   `bge-m3` leads Tamil (0.579) and Hindi (0.717).
2. **Cross-script retrieval fails for all three.** `tanglish_ta` (Tanglish query
   → Tamil-script document) = **0.000 for every candidate**. 76–80% of top-5
   slots went to same-script documents. This is model-independent and requires a
   transliteration / script-normalisation layer regardless of model choice.
3. **The "no E5 prefixes" conclusion does not hold up.** With proper retrieval
   metrics the prefix effect is within noise (`e5-base` 0.671 prefixed vs 0.698
   unprefixed R@3). **The documented `query:`/`passage:` convention is now the
   production configuration**, superseding §5 of this ADR.
4. **No candidate fits the current `vector(384)` schema.** Any selection requires
   a pgvector migration plus full re-embedding of Module 13 and Module 19 data.

## 12.5 Cost profile (CPU, measured)

| Model | Dim | Single-query p95 | Docs/s | Peak RSS | Disk | 1M-vector storage |
|---|---:|---:|---:|---:|---:|---:|
| `tamil-embed-base` | 768 | 33.9 ms | 34.8 | 1534 MB | 1077 MB | 2930 MB |
| `multilingual-e5-base` | 768 | 34.5 ms | 34.7 | 1540 MB | 1103 MB | 2930 MB |
| `bge-m3` | 1024 | 88.2 ms | 9.96 | 2374 MB | 2208 MB | 3906 MB |

Tamil-Embed Matryoshka: 512d = 0.680 R@3 @ 1953 MB/1M (only −0.009 vs 768 for
−33% storage); 256d = 0.627 R@3 @ 977 MB/1M.
**384 is not a trained Matryoshka dimension — slicing to match the current
schema is unsupported.**

## 12.6 Status of this ADR after re-evaluation

> **EMBEDDING DECISION: PENDING — RE-EVALUATED, LEADING CANDIDATE `BAAI/bge-m3` (1024d)**

- `intfloat/multilingual-e5-small` (original §1–11 selection) is **no longer the
  recommendation**; it was not in the re-evaluated candidate set.
- Leading candidate: `BAAI/bge-m3` on quality and on both Indian-script targets.
- Strongest alternative: `Tamil-ai/tamil-embed-base` @512d for throughput, RAM
  and storage.
- **No production model has been changed.** `chunks.embedding` remains
  `vector(384)`; no production configuration was modified.
- Final approval remains with the product owner.
- A further validation round is recommended (larger corpus, bootstrap CIs,
  transliteration-normalised condition) before sign-off, because the
  Tamil-specialised model's Tamil weakness rests on one 113-document corpus.

Full evidence: `docs/eval/embedding_top3_benchmark/benchmark_report.md`

---

# 13. FINAL DECISION (2026-10-03) — Phase 2 approval

> This section supersedes §1–§12. The historical sections are retained so the
> reasoning that led here stays auditable.

## 13.1 Selected

```text
Selected:        intfloat/multilingual-e5-base
Dimension:       768
Query prefix:    query:
Document prefix: passage:
Similarity:      cosine
Normalization:   L2
dtype:           float32
Max sequence:    512
Device:          cpu  (configurable)
Batch size:      16  (configurable)
Revision pin:    d128750597153bb5987e10b1c3493a34e5a4502a
Version stamp:   e5-base-v1
Production access: Unified EmbeddingService only
```

**Status: ACCEPTED.** The product owner has explicitly selected this model.

## 13.2 Production access boundary

Only `apps/api/app/ai/embedding/` knows the model name. Every other component
depends on the `EmbeddingService` abstraction:

```text
Memory Engine ─┐
Voice Engine  ─┼─> EmbeddingService ─> E5 adapter ─> multilingual-e5-base
Jobs          ─┘
```

No feature module may import `sentence_transformers` or name a model. This is
enforced by `tests/integration/test_architecture_contract.py`.

## 13.3 Vector migration executed

| Migration | Phase | Effect |
|---|---|---|
| `003_embedding_768_expand` | expand | added `embedding_v2 vector(768)`, provenance columns, `schema_migrations`; relaxed the legacy 384-d `NOT NULL` |
| `app.memory.reembed` | backfill | re-embedded every chunk with genuine E5 `passage:` output |
| `004_embedding_768_contract` | contract | dropped the 384-d column, promoted 768-d to `embedding`, restored `NOT NULL`, rebuilt the ivfflat index |

Verified in `docs/PHASE_2_FINAL_REPORT.md` §4. Final schema:
`chunks.embedding vector(768) NOT NULL`, single vector column, no duplicates.

## 13.4 Why not `BAAI/bge-m3`

It led §12 on quality (R@3 0.711 vs 0.671; Tamil 0.579 vs 0.509; Devanagari 0.717
vs 0.587) but was **not selected**:

| Factor | Consequence |
|---|---|
| 1024 dimensions | 33% more storage per vector than 768 (3906 MB vs 2930 MB per 1M vectors, §12.5) |
| CPU throughput | 9.96 docs/s vs 34.7 docs/s for e5-base — **3.5x slower** |
| Peak RSS | 2374 MB vs 1540 MB |
| p95 latency | 88.2 ms vs 34.5 ms |
| Approval scope | The owner selected **768-d E5-base** |

The quality gap was also smaller than it first appears: the independent
re-analysis established that **R@3 differences between all three candidates are
not statistically distinguishable**. Only a R@1 advantage for bge-m3 was
significant. Choosing 1024-d bge-m3 for a R@3 difference that is not
statistically real, at 3.5x the CPU cost and 33% more storage, is not defensible.

## 13.5 Why not `Tamil-ai/tamil-embed-base`

| Finding | Consequence |
|---|---|
| **Worst** Tamil-script retrieval of the three candidates (0.474 vs 0.509 e5-base, §12.3) | Directly contradicts its purpose as a Tamil-specialised model |
| Tamil query → Tamil document, R@3 = **0.72** | **Below** both bge-m3 (0.80) and e5-base (0.80) |
| Its vector space derives from e5-base but is not compatible | Would require a second re-embedding and a second index |
| No R@3 advantage | Not statistically distinguishable from the others |

Note the correct reading of the earlier claim: **"Tamil-Embed is not best on
Tamil" is true, and its own specialisation did not deliver on Tamil.** This is
recorded so the decision is not re-litigated on the assumption that a
Tamil-specialised model must win on Tamil.

## 13.6 Benchmark limitations (carried forward, not resolved)

These limitations are **unchanged** by this decision and remain open:

1. **The corpus was never human-validated.** 0 of 30 sampled pairs were reviewed
   by a Tamil speaker. Tamil and Tanglish naturalness are **UNKNOWN**.
2. **Small cross-script slices.** Tanglish → Tamil is n=12; all cross-script is
   n=44. A 0/12 → 3/12 change is not statistically distinguishable from noise.
3. **Synthetic corpus.** Single-agent generation; 2 confirmed CJK-character
   contaminations (~0.6%) in Tanglish/code-mixed items.
4. **R@3 model differences are not statistically established.** No pairwise
   R@3 gap survives scrutiny.
5. **"BGE-M3 is ahead across the major retrieval metrics" is NOT supported.**

## 13.7 Script normalisation is NOT part of the solution

§12.4 item 2 concluded that cross-script failure "requires a transliteration /
script-normalisation layer regardless of model choice". **The follow-up
experiment refuted the obvious implementation of that recommendation**, so this
ADR does not adopt normalisation:

| Strategy | Effect |
|---|---|
| Query → native script (option A) | Tanglish→Tamil 0/12 → 3/12 (p=0.248, **not significant**); **same-script regression −0.087 to −0.149, p ≤ 0.0002** |
| Everything → Latin (option B) | cross-script R@5 collapses to **0.000** for two of three models |

The underlying finding stands and is more important than the remedy: the failure
is a **script** failure, not a language-modelling failure. The productive
direction is script-aware indexing or routing with a genuine Tanglish↔Tamil
lexical resource — **not** scheme-based transliteration. Transliteration is
prohibited in Phase 2 production code and enforced by a contract test.

## 13.8 Configuration keys

```bash
EMBEDDING_MODEL=intfloat/multilingual-e5-base
EMBEDDING_REVISION=d128750597153bb5987e10b1c3493a34e5a4502a
EMBEDDING_DIMENSION=768
EMBEDDING_DEVICE=cpu
EMBEDDING_BATCH_SIZE=16
EMBEDDING_MAX_SEQ_LENGTH=512
EMBEDDING_NORMALIZE=true
EMBEDDING_QUERY_PREFIX="query: "
EMBEDDING_DOCUMENT_PREFIX="passage: "
EMBEDDING_VERSION=e5-base-v1
```

## 13.9 Installed library versions (measured, not assumed)

Recorded from the running container on 2026-10-03:

| Package | Version |
|---|---|
| Python | 3.12.15 |
| sentence-transformers | 3.4.0 |
| transformers | 4.57.6 |
| torch | 2.14.1 |
| tokenizers | 0.22.2 |
| huggingface-hub | 0.36.2 |
| numpy | **1.26.4** |
| safetensors | 0.8.0 |
| pgvector (python) | 0.5.0 |
| fastapi | 0.115.0 |
| pydantic | 2.10.0 |
| sqlalchemy | 2.0.36 |
| asyncpg | 0.29.0 |
| OS / kernel | Linux 6.8.0-138-generic, glibc 2.41 |

Tokenizer: `XLMRobertaTokenizerFast`. Reported dimension 768, `max_seq_length`
512 — both confirmed at load time.

> Correction carried forward: §1–§12 of the *evaluation* report previously
> listed numpy 2.5.3, copied in error from another module's requirements.
> The measured version is **1.26.4**.

## 13.10 Removing models from Phase 2 scope

`BAAI/bge-m3` and `Tamil-ai/tamil-embed-base` are benchmark candidates only.
Phase 2 must not install them, add adapters or configuration for them, add
fallbacks for them, or re-run their benchmarks. Their results remain historical
evaluation evidence in `docs/eval/`. Enforced by
`tests/integration/test_architecture_contract.py`
(`test_removed_models_are_rejected`, `test_removed_models_absent_from_entire_app`).
