# Top 3 Embedding Benchmark

Creator Platform SaaS — unified embedding decision (Phase 2 gate)

Run date: 2026-10-03 · Dataset SHA256/16: `e24337b5380674b0` · Seed: `20260303` (no sampling performed)

---

## 1. Executive Summary

Three candidates were benchmarked for the unified Creator Platform embedding
requirement:

| Candidate | Dims measured | Revisions tested |
|---|---|---|
| `Tamil-ai/tamil-embed-base` | 768 / 512 / 256 (Matryoshka) | `a5b5aa23a0a7eee…` |
| `intfloat/multilingual-e5-base` | 768 | `d128750597153bb5…` |
| `BAAI/bge-m3` | 1024 (dense only) | `5617a9f61b028005…` |

**What was tested.** 225 fixed queries against 113 creator-platform documents,
spanning English, Tamil, Hindi, Tanglish, Hinglish and code-mixed content, across
16 distinct retrieval phenomena. One shared retrieval pipeline
(`encode → cosine → top-k`), run in an isolated in-memory numpy index. No
PostgreSQL or pgvector object was created or modified.

**Three findings dominate this report:**

1. **A Tamil-specialised model did not win on Tamil.** Bucketed by the script
   of the target document, `bge-m3` retrieved Tamil-script content best
   (R@3 0.579) and `tamil-embed-base` retrieved it *worst* (0.474) — the
   opposite of the model's positioning.
2. **Cross-script retrieval fails universally.** Tanglish (Latin-script Tamil)
   queries retrieved Tamil-script documents at **R@3 = 0.000 for all three
   models**. ~76–80% of top-5 slots went to same-script documents rather than
   the semantically correct document.
3. **No candidate fits the current production schema.** `chunks.embedding` is
   `vector(384)`; all candidates are 768 or 1024 (Tamil-Embed 256 is the only
   one *smaller* than production, at 1.0 GB per 1M vectors vs 1.5 GB today).

No production model is selected by this report. See §12.

---

## 2. Models

| Model | Params | Dimension | Languages | Special characteristics |
|---|---:|---:|---|---|
| `Tamil-ai/tamil-embed-base` | 278M | 768 (Matryoshka 768/512/256/128/64) | Tamil, English | Fine-tuned from `multilingual-e5-base`; Tamil NLI + Samanantar EN–TA parallel (~50K pairs); MatryoshkaLoss + MultipleNegativesRankingLoss; apache-2.0 |
| `intfloat/multilingual-e5-base` | 278M | 768 | 100+ | XLM-R large; documented asymmetric retrieval format (`query:` / `passage:`); MIT |
| `BAAI/bge-m3` | 568M | 1024 | 100+ | Dense + sparse + ColBERT multi-function; up to 8192 tokens; MIT |

**Dense-only scope.** `bge-m3` supports hybrid (dense+sparse) and ColBERT
retrieval. Per benchmark scope, **only its dense embedding is used** in the
main comparison, so that all candidates share one retrieval architecture and
one storage profile. Hybrid retrieval is recorded as an experimental note in
§11.4 and does **not** affect any number in this report.

**Documented input conventions were respected (not guessed):**

| Model | Query encoding | Document encoding | Source |
|---|---|---|---|
| `tamil-embed-base` | `query: <text>` | `passage: <text>` | Model card shows `query:`/`passage:`; inherits E5 base |
| `multilingual-e5-base` | `query: <text>` | `passage: <text>` | Official asymmetric retrieval format |
| `bge-m3` | raw text | raw text | *"the BGE-M3 model no longer requires adding instructions to the queries"* |

---

## 3. Benchmark Environment

| Item | Value |
|---|---|
| OS | Ubuntu 22.04.5 LTS, kernel 6.8.0-138-generic |
| CPU | 12th Gen Intel(R) Core(TM) i5-12450H — 8 physical cores / 12 threads |
| RAM | 15 GiB total |
| GPU | NVIDIA GeForce RTX 2050 (4096 MiB) — **present but deliberately NOT used** |
| Python | 3.12.15 |
| PyTorch | 2.14.1+cu130 |
| transformers | 4.57.6 |
| sentence-transformers | 3.4.0 |
| numpy | 2.5.3 |
| Device used | CPU, float32 |
| Normalisation | L2 (sentence-transformers `Normalize` module present in all three) |
| Similarity | cosine = dot product of L2-normalised vectors |
| Batch size | 16 |
| Max sequence length | **512 for all three** (see §3.1) |

**CPU-first policy.** The target deployment must not depend on a 4 GB laptop
GPU for embedding-service availability, so all primary measurements are CPU.
GPU numbers were not collected; the GPU is listed for transparency only.

### 3.1 Fairness controls

* **Same dataset** — one `dataset.json` (`e24337b5380674b0`) consumed by all.
* **Same retrieval algorithm** — numpy cosine, `argsort` top-5, identical code path.
* **`max_seq_length` pinned to 512 for all three**, including `bge-m3` whose
  native limit is 8192. This is intentional for fairness but means **bge-m3's
  long-document advantage is not exercised here.** Creator Platform chunks are
  short, so this is unlikely to be decisive, but it is a known limitation.
* **No model-specific preprocessing** beyond the documented prefixes. In
  particular, no transliteration or script normalisation was applied to any
  model (see §10).
* **Isolated subprocess per model** so peak RSS is attributable to exactly one model.

---

## 4. Dataset

| Metric | Count |
|---|---:|
| Documents | 113 |
| Queries | 225 |
| Graded relevant pairs (grade 2) | 256 |
| Related pairs (grade 1, used for nDCG) | 111 |
| Distinct retrieval phenomena | 16 |

**Documents by language**

| Language | Docs |
|---|---:|
| English | 45 |
| Tamil (script) | 19 |
| Hindi (script) | 15 |
| Tanglish | 12 |
| Hinglish | 12 |
| Code-mixed (TA+EN / HI+EN / EN) | 10 |

**Documents by content type** — the Creator Platform artifact types:
caption 20 · hook 20 · memory/RAG chunk 18 · script 11 · comment 10 ·
strategy 9 · lesson 8 · performance 7 · idea 8 · voice 6 · snippet 5

**Queries by phenomenon**

| Phenomenon | Meaning | Queries |
|---|---|---:|
| `en_mono` | English → English | 30 |
| `ta_mono` | Tamil script → Tamil | 25 |
| `hi_mono` | Hindi script → Hindi | 22 |
| `tanglish_mono` | Tanglish → Tanglish | 20 |
| `hinglish_mono` | Hinglish → Hinglish | 20 |
| `code_mixed` | TA+EN / HI+EN mixed → mixed | 14 |
| `ta_en` | Tamil query → English doc | 12 |
| `en_ta` | English query → Tamil doc | 12 |
| `tanglish_ta` | Tanglish query → Tamil script doc | 12 |
| `hi_en` | Hindi query → English doc | 10 |
| `en_hi` | English query → Hindi doc | 10 |
| `hinglish_hi` | Hinglish query → Hindi script doc | 10 |
| `tanglish_en` | Tanglish query → English doc | 8 |
| `hinglish_en` | Hinglish query → English doc | 8 |
| `ta_tanglish` | Tamil query → Tanglish doc | 6 |
| `hi_hinglish` | Hindi query → Hinglish doc | 6 |

### 4.1 Integrity verification (pre-flight)

Automated checks in `scripts/top3_benchmark/build_dataset.py`, run **before any
model was loaded**:

| Check | Result |
|---|---|
| Duplicate document ids | PASS |
| Duplicate query ids / duplicate query text | PASS |
| Every relevance label resolves to a real document | PASS |
| Every query has ≥1 relevant document | PASS |
| No id in both `relevant` and `related` | PASS |
| **LEAKAGE** — no query string appears verbatim inside any referenced document | PASS **after 15 rewrites** |
| Near-duplicate contamination (≥0.85 token overlap) | none flagged |

The leakage detector initially caught **15 real contaminations** (e.g. a Hinglish
query that was a verbatim substring of its own target document). All were
rewritten into genuine paraphrases before any model was run. This is recorded
because it materially affects comparability with the earlier 36-document/15-query
benchmark, whose dataset was never leakage-checked.

---

## 5. Overall Retrieval Results

Dense retrieval, cosine similarity, top-5, 225 queries.

| Model | Dim | Recall@1 | Recall@3 | Recall@5 | MRR | nDCG@5 |
|---|---:|---:|---:|---:|---:|---:|
| `BAAI/bge-m3` | 1024 | **0.578** | **0.711** | **0.773** | **0.651** | **0.723** |
| `Tamil-ai/tamil-embed-base` | 768 | 0.484 | 0.689 | 0.751 | 0.588 | 0.664 |
| `intfloat/multilingual-e5-base` | 768 | 0.538 | 0.671 | 0.729 | 0.607 | 0.679 |
| `tamil-embed-base` *(ablation, no prefix)* | 768 | 0.507 | 0.707 | 0.756 | 0.608 | 0.683 |
| `multilingual-e5-base` *(ablation, no prefix)* | 768 | 0.538 | 0.698 | 0.720 | 0.613 | 0.683 |

**Prefix ablation.** The earlier ADR-002 conclusion of "no manual prefixes" was
derived from `multilingual-e5-**small**` using a single similarity pair on a
36-document corpus. Re-tested properly here, the documented prefix convention
makes **no material difference**: `e5-base` 0.671 (prefixed) vs 0.698
(unprefixed) R@3; `tamil-embed` 0.689 vs 0.707. The effect is within noise on
this dataset. **The documented convention is retained as the production
configuration**, and ADR-002's "no prefix" wording should be treated as
superseded. Ablations are labelled and excluded from the primary comparison.

---

## 6. Language Breakdown

### 6.1 By retrieval phenomenon (Recall@3)

| Phenomenon | tamil-embed 768 | e5-base 768 | bge-m3 1024 |
|---|---:|---:|---:|
| `en_mono` | **0.967** | **0.967** | 0.933 |
| `ta_mono` | 0.720 | **0.800** | **0.800** |
| `hi_mono` | 0.727 | 0.727 | **0.773** |
| `tanglish_mono` | 0.800 | **0.900** | **0.900** |
| `hinglish_mono` | 0.950 | **1.000** | 0.950 |
| `code_mixed` | 0.857 | 0.857 | 0.857 |
| `ta_en` | **0.583** | 0.250 | **0.583** |
| `en_ta` | 0.500 | 0.417 | **0.667** |
| `hi_en` | **0.800** | 0.600 | 0.700 |
| `en_hi` | **0.900** | 0.700 | **0.900** |
| `tanglish_ta` | **0.000** | **0.000** | **0.000** |
| `tanglish_en` | **0.125** | **0.000** | **0.000** |
| `ta_tanglish` | 0.667 | **0.833** | 0.500 |
| `hinglish_hi` | 0.100 | **0.000** | **0.300** |
| `hinglish_en` | 0.500 | 0.500 | 0.500 |
| `hi_hinglish` | 0.833 | **1.000** | 0.833 |

### 6.2 By script of the target document (Recall@3) — the fairest "can it find Tamil/Hindi?" view

| Target document script | n | tamil-embed 768 | e5-base 768 | bge-m3 1024 |
|---|---:|---:|---:|---:|
| Latin (EN / Tanglish / Hinglish) | 153 | **0.804** | 0.778 | 0.797 |
| **Tamil script** | 57 | 0.474 | 0.509 | **0.579** |
| **Devanagari (Hindi script)** | 46 | 0.652 | 0.587 | **0.717** |

**This is the report's most decision-relevant table.** The Tamil-specialised
model has the *lowest* Tamil-script recall and the *highest* Latin-script
recall. It retrieves Tanglish better than it retrieves Tamil.

---

## 7. Latency (CPU, float32)

| Model | Load (s) | Cold 1st batch (ms) | Single query p95 (ms) | Batch p95, 113 docs (ms) | Docs/s | Queries/s |
|---|---:|---:|---:|---:|---:|---:|
| `tamil-embed-base` 768 | 6.42 | 550.8 | 33.9 | 3391.9 | **34.80** | **38.7** |
| `multilingual-e5-base` 768 | 7.29 | 542.4 | 34.5 | 3372.9 | 34.69 | 38.6 |
| `bge-m3` 1024 | 7.28 | 1833.7 | 88.2 | 11326.1 | 9.96 | 11.0 |

Backfill implication at these rates (1,000,000 documents):

| Model | Backfill wall-clock (1 worker) |
|---|---:|
| `tamil-embed-base` / `e5-base` | ≈ 8.0 hours |
| `bge-m3` | ≈ 27.8 hours |

Both are viable as background jobs; `bge-m3` is 3.3× the cost.

---

## 8. Resource Usage

| Model | Peak RSS | Steady RSS | Disk download | Dim | 1M-vector storage | vs 768 baseline |
|---|---:|---:|---:|---:|---:|---:|
| `tamil-embed-base` 768 | 1534 MB | 1535 MB | **1077 MB** | 768 | 2930 MB | 1.00 |
| `tamil-embed-base` 512 | 1534 MB | 1535 MB | 1077 MB | 512 | 1953 MB | 0.667 |
| `tamil-embed-base` 256 | 1534 MB | 1535 MB | 1077 MB | 256 | **977 MB** | 0.333 |
| `multilingual-e5-base` 768 | 1540 MB | 1542 MB | 1103 MB | 768 | 2930 MB | 1.00 |
| `bge-m3` 1024 | **2374 MB** | 2375 MB | **2208 MB** | 1024 | **3906 MB** | 1.333 |

Measured, not read from model cards. `bge-m3` costs **+55% RAM** and **+105%
disk** versus the 278M candidates.

**Current production reference:** `chunks.embedding vector(384)` ⇒ 1465 MB per
1M vectors. No candidate matches 384.

---

## 9. Tamil-Embed Matryoshka Analysis

| Dimension | Recall@3 | MRR | nDCG@5 | Batch p95 (ms) | Storage / 1M | vs 768 |
|---:|---:|---:|---:|---:|---:|---:|
| 768 | **0.689** | **0.588** | **0.664** | 3391.9 | 2930 MB | 1.00 |
| 512 | 0.680 | 0.572 | 0.650 | 3391.9 | 1953 MB | 0.667 |
| 256 | 0.627 | 0.535 | 0.626 | 3391.9 | 977 MB | 0.333 |

Encoding cost is identical across dimensions (truncation happens after the
forward pass), so latency is unchanged — the trade-off is purely
quality vs storage.

**Reading:** 512 costs only **0.009 R@3** for a **33% storage saving**, which is
an attractive operating point. 256 costs 0.062 R@3 for 67% saving.

> **Matryoshka caveat:** the model card advertises 768/512/256/128/64.
> **384 is not a trained Matryoshka dimension.** Slicing to 384 to match the
> current production `vector(384)` column is therefore *untested and
> unsupported*; it must not be assumed to work.

---

## 10. Failure Analysis

### 10.1 Cross-script retrieval fails for all three candidates (most important finding)

`failure_analysis.json` measures whether the top-5 slots go to documents in the
**same script as the query** rather than the semantically correct document.

| Model | Cross-script queries | Missed @3 | Miss rate | Script-lock ratio |
|---|---:|---:|---:|---:|
| `tamil-embed` 768 | 50 | 35 | 0.700 | 0.788 |
| `e5-base` 768 | 50 | 35 | 0.700 | 0.804 |
| `bge-m3` 1024 | 50 | 35 | 0.700 | 0.756 |

`tanglish_ta` (Tanglish query → Tamil-script document) scores **0.000 for all
three**. `hinglish_hi` never exceeds 0.300.

**Concrete example — `q_x_tan_ta_001`**, query *"tamil la aval uthaippu vida
kuraiya padakkum illa"* (Tanglish), correct answer `d_ta_cap_002`
(Tamil script, about scarce Tamil technical content):

| Model | Top-3 actually returned |
|---|---|
| `tamil-embed` 768 | `d_tan_cap_002` (Tanglish) · `d_hin_cap_002` (Hinglish) · `d_hin_com_001` (Hinglish) |
| `e5-base` 768 | `d_tan_cap_002` (Tanglish) · `d_mix_ta_004` (TA+EN) · `d_tan_less_001` (Tanglish) |
| `bge-m3` 1024 | `d_tan_cap_002` (Tanglish) · `d_mix_ta_004` (TA+EN) · `d_tan_hook_001` (Tanglish) |

All three return the **same-language transliteration** of the answer rather
than the Tamil-script original — even though the Tamil-script original was
ranked highly by a human and present in the corpus. Across all 50 cross-script
queries, 76–80% of top-5 slots were same-script.

**Why this matters for the product.** Indian creators routinely type in
Tanglish/Hinglish while (or while not) consuming native-script content. This is
a **model-independent architectural gap**: whichever candidate is chosen, the
platform needs a script-normalisation / transliteration layer (e.g.Indic
transliteration applied at index time and/or query time) before vector search.
Choosing a different embedding model does not solve it.

### 10.2 Where each candidate wins

**`bge-m3` succeeds where others fail**
- `en_ta` (English query → Tamil doc): **0.667** vs 0.500 / 0.417.
- Tamil-script targets: **0.579** vs 0.474 / 0.509.
- Devanagari targets: **0.717** vs 0.652 / 0.587.
- `hinglish_hi` (hardest case): **0.300** vs 0.100 / 0.000 — still poor, but 3× the best alternative.
- Overall MRR 0.651 — relevant documents appear at rank 1 most consistently.

**`multilingual-e5-base` succeeds where others fail**
- `hinglish_mono`: **1.000** (perfect) vs 0.950 / 0.950.
- `hi_hinglish`: **1.000** vs 0.833 / 0.833.
- `ta_tanglish`: **0.833** vs 0.667 / 0.500.
- Strongest monolingual profile overall despite the lowest aggregate R@3.

**`tamil-embed-base` succeeds where others fail**
- `ta_en` (Tamil query → English doc): **0.583**, tied best with `bge-m3`, vs
  `e5-base`'s 0.250. It is the only candidate that does not collapse on this
  direction.
- `hi_en`: **0.800** vs 0.600 / 0.700.
- Smallest disk footprint (1077 MB).
- Only candidate offering a genuine storage/quality dial (Matryoshka).

**Where all three fail**
- `tanglish_ta` = 0.000, `tanglish_en` ≤ 0.125, `hinglish_hi` ≤ 0.300.
- `hinglish_en` = 0.500 for all three — a shared weakness on Hinglish → English.

---

## 11. Trade-off Analysis

### 11.1 Retrieval quality
`bge-m3` leads on every aggregate metric (R@1 0.578, R@3 0.711, MRR 0.651,
nDCG 0.723) and on both Indian-script target buckets. `tamil-embed` is second
on R@3 (0.689). `e5-base` is last on aggregate R@3 (0.671) yet wins three
monolingual/transliteration phenomena — its losses are concentrated in
cross-lingual directions (`ta_en` 0.250).

### 11.2 Tamil quality
Counter-intuitively **not** won by the Tamil-specialised model. On Tamil-script
targets: `bge-m3` 0.579 > `e5-base` 0.509 > `tamil-embed` 0.474. Plausible
causes: narrow training corpus (~50K EN–TA pairs vs `e5-base`'s ~500M pairs);
Matryoshka loss trading full-dimension quality; and an asymmetric-retrieval task
that differs from its symmetric NLI/parallel training objective. This warrants
caution before generalising — it is one dataset.

### 11.3 Hindi quality
`bge-m3` 0.717 > `tamil-embed` 0.652 > `e5-base` 0.587. Tamil-Embed has no
Hindi training signal, yet still edges `e5-base` here.

### 11.4 Code-mixed quality
Effectively tied (0.857 for all three). At 256d `tamil-embed` reaches 0.929,
which is within noise of the others on n=14.

### 11.5 Latency
`tamil-embed` ≈ `e5-base` (34.8 vs 34.7 docs/s). `bge-m3` is **3.3× slower**
(9.96 docs/s) and 2.6× slower per single query (88.2 vs ~34 ms p95). Both remain
acceptable for a background-ingest architecture; `bge-m3` is not disqualifying on
latency alone.

### 11.6 Memory and disk
`bge-m3` needs **+55% RSS** (2374 vs ~1535 MB) and **+105% disk** (2208 vs
~1090 MB). At 8 concurrent workers `bge-m3` would need ~19 GB RSS versus ~12 GB —
relevant on a 15 GB host.

### 11.7 Storage
1M vectors: `bge-m3` 3906 MB · 768-d candidates 2930 MB · Tamil-Embed 512
1953 MB · Tamil-Embed 256 977 MB. Current production (384) is 1465 MB. A move to
any 768/1024 candidate roughly **doubles or triples** vector storage versus today.

### 11.8 Implementation complexity
All three are plain sentence-transformers models with identical integration
shape (`Transformer → Pooling → Normalize`), so integration complexity is
effectively equal. Differences are conventions only: prefixes for two of them.
`bge-m3` adds optional hybrid/ColBERT capability (unused here) and a 3.5×
larger download. `tamil-embed` requires `trust_remote_code=True`.

### 11.9 Experimental note (does not affect any measured number)
`bge-m3` can emit sparse lexical weights alongside dense vectors, enabling hybrid
dense+BM25-style retrieval with no extra model. Given §10.1 — where all three
models fail on script mismatch — a **lexical/BM25 side-channel is a plausible
mitigation** for transliterated queries, because lexical matching can bridge
Tanglish→Tamil-script tokens. This is unmeasured and out of scope for this gate.

---

## 12. Recommendation

**No production model is selected by this report.** Final approval remains with
the product owner.

### Recommended candidate: `BAAI/bge-m3` (1024d dense)

**Primary evidence**
- Best on every aggregate metric: R@1 0.578, R@3 0.711, R@5 0.773, MRR 0.651, nDCG 0.723.
- Best on both Indian-script target buckets — Tamil **0.579** and Devanagari **0.717** — which are the platform's differentiating requirement.
- Best cross-lingual direction (`en_ta` 0.667) and best MRR, i.e. correct documents surface at rank 1 most often.
- Only candidate with meaningful traction on the hardest phenomenon (`hinglish_hi` 0.300 vs 0.100 / 0.000).

**Strongest alternative: `Tamil-ai/tamil-embed-base` @ 512d**
- Best `ta_en` (0.583) and `hi_en` (0.800) among practical options; smallest disk (1077 MB).
- Matryoshka 512 gives 1953 MB/1M (33% less than 768) for only −0.009 R@3 — the best quality-per-storage operating point available.
- Compensates for `bge-m3`'s latency/RAM cost by ~3.4× throughput and ~35% less RAM.
- Rejected **as the primary choice** because it is the weakest on Tamil-script retrieval (0.474), which is the requirement it was selected to serve.

**Not recommended for v1: `intfloat/multilingual-e5-base`**
- Lowest aggregate R@3 (0.671), and a notable collapse on `ta_en` (0.250). Retain only as a fallback baseline.

### Important limitations of this recommendation

1. **Cross-script retrieval is unsolved by all three.** Choosing `bge-m3` does not fix Tanglish→Tamil-script search. A transliteration / script-normalisation layer is required regardless of model choice, and should be scoped as separate Phase 2 work.
2. **No candidate fits `vector(384)`.** Selecting any of them requires a pgvector schema migration and a full re-embedding of Module 13 and Module 19 data.
3. **Single dataset, single run, no significance test.** Differences of <0.03 R@3 (e.g. the prefix ablation, Tamil-Embed 512 vs 768) are within noise. A bootstrap confidence interval over queries would be appropriate before treating small gaps as real.
4. **The corpus is 113 documents.** Rankings may shift on a production-scale corpus, particularly for the Tamil-specialised model, whose weakness could partly reflect corpus composition.
5. **`bge-m3`'s 8192-token capability was disabled** (pinned to 512 for fairness). Its long-context advantage is untested.
6. **CPU-only.** Results may differ under GPU or under a production CPU SKU.
7. **CPU saturation.** The host is a 12-thread laptop; throughput figures will not transfer directly to production hardware.

### Is another validation round warranted?

**Yes — one targeted round is justified before final sign-off**, because two
findings are decision-critical and currently rest on a single small dataset:

- Expand the corpus to ~500–1000 documents and queries to ~500, then re-run the
  same fixed pipeline, to test whether the Tamil-specialised model's Tamil-script
  weakness (0.474) is real or a corpus artefact.
- Add an explicit transliteration-normalised condition to quantify how much of
  the cross-script failure a preprocessing layer would recover.
- Add bootstrap confidence intervals so 0.02–0.03 gaps can be interpreted.

Until that round runs, `bge-m3` should be treated as the **leading candidate
under evaluation**, not an approved production dependency.

---

## 13. Validation Checklist

| # | Requirement | Status |
|---|---|---|
| 1 | Exactly three primary models benchmarked | PASS — tamil-embed, e5-base, bge-m3 (+2 labelled ablations) |
| 2 | Same dataset for all models | PASS — `e24337b5380674b0` |
| 3 | Same retrieval algorithm | PASS — numpy cosine, identical code path |
| 4 | E5 prefixes correctly applied | PASS — `query:`/`passage:`; ablation reported separately |
| 5 | Tamil-Embed tested at 768/512/256 | PASS |
| 6 | Tamil tested | PASS — `ta_mono`, `en_ta`, `ta_en`, `ta_tanglish`, `tanglish_ta` |
| 7 | Hindi tested | PASS — `hi_mono`, `en_hi`, `hi_en`, `hi_hinglish`, `hinglish_hi` |
| 8 | Tanglish tested | PASS — `tanglish_mono`, `tanglish_ta`, `tanglish_en` |
| 9 | Hinglish tested | PASS — `hinglish_mono`, `hinglish_hi`, `hinglish_en` |
| 10 | Code-mixed tested | PASS — 14 queries + 10 mixed documents |
| 11 | Cross-lingual tested | PASS — 74 cross-lingual/cross-script queries |
| 12 | Recall@1/3/5 measured | PASS |
| 13 | MRR measured | PASS |
| 14 | nDCG@5 measured | PASS (graded relevance) |
| 15 | Latency p50/p95/p99 measured | PASS — single + batch + cold + throughput |
| 16 | RAM measured | PASS — peak + steady RSS via psutil/ru_maxrss |
| 17 | Storage measured | PASS — measured dims × fp32, per 1M vectors |
| 18 | Disk/download size measured | PASS — actual snapshot size |
| 19 | Raw results saved | PASS — `raw_results.json`, `retrieval_results.json`, … |
| 20 | Reproducibility metadata saved | PASS — `environment.json`, commit SHAs, seed, dataset hash |
| 21 | Production pgvector schema unchanged | PASS — `chunks.embedding` still `vector(384)`; no DB object touched |
| 22 | Production embedding model config unchanged | PASS — not modified |
| 23 | `modules/` unchanged | PASS — read-only |
| 24 | No Phase 2 implementation started | PASS — benchmark scripts only, under `scripts/` |
| 25 | Existing documentation historically accurate | PASS — prior results left intact, re-evaluation recorded additively |

---

## 14. Artefacts

| File | Contents |
|---|---|
| `dataset.json` | Fixed 113-document / 225-query dataset + metadata hash |
| `integrity_report.json` | Leakage / duplication / coverage verification |
| `benchmark_config.json` | Batch size, max_seq_length, similarity, run counts |
| `raw_results.json` | Full per-query output for all 5 configurations |
| `retrieval_results.json` | Metrics overall + per-phenomenon + per-language, incl. ablations |
| `latency_results.json` | Cold/warm, single/batch p50/p95/p99, throughput |
| `resource_results.json` | Peak/steady RAM, disk, params |
| `storage_analysis.json` | Per-1M-vector storage and relative cost |
| `language_breakdown.json` | Metrics bucketed by query script + phenomenon |
| `target_language_breakdown.json` | Metrics bucketed by **target document script** |
| `failure_analysis.json` | Script-lock evidence and concrete failure examples |
| `summary.json` | One record per model/configuration + environment |
| `environment.json` | Hardware/software/commit SHAs |

Benchmark source: `scripts/top3_benchmark/` (`build_dataset.py`, `run_benchmark.py`,
`aggregate_results.py`, dataset modules). Reproduce with:

```bash
python3 scripts/top3_benchmark/build_dataset.py            # emits dataset.json + integrity
docker exec -e TOP3_ROOT=/app -e TOP3_OUT=/app/docs/eval/embedding_top3_benchmark \
  -w /app/top3 creator-api python run_benchmark.py         # all candidates
python3 scripts/top3_benchmark/aggregate_results.py
```
