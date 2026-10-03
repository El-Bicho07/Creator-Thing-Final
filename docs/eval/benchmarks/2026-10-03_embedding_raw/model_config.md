# Model Configuration — 2026-10-03 Embedding Benchmark

## 1. The three primary models

| | `bge_m3` | `tamil_embed` | `e5_base` |
|---|---|---|---|
| **HF repo id (exact)** | `BAAI/bge-m3` | `Tamil-ai/tamil-embed-base` | `intfloat/multilingual-e5-base` |
| **Commit SHA (pinned)** | `5617a9f61b028005a4858fdac845db406aefb181` | `a5b5aa23a0a7eee1e7eccee53c5835c6e68b06ce` | `d128750597153bb5987e10b1c3493a34e5a4502a` |
| **Variant measured** | 1024 (native, dense only) | 768 (native; 512/256 also run as Matryoshka slices) | 768 (native) |
| **Parameters (measured)** | 567.8 M | 278.0 M | 278.0 M |
| **Tokenizer** | `XLMRobertaTokenizerFast` | `XLMRobertaTokenizerFast` | `XLMRobertaTokenizerFast` |
| **Module stack** | `Transformer → Pooling → Normalize` | same | same |
| **Pooling** | **CLS token** (`pooling_mode_cls_token=True`) | **mean of tokens** | **mean of tokens** |
| **Embeddings L2-normalised?** | **Yes** — explicit `Normalize` module; measured L2 norm = 1.0 | **Yes** — same | **Yes** — same |
| **Max sequence length** | **512** (overridden; native limit 8192) | 512 (native 512) | 512 (native 512) |
| **Truncation** | tail truncation at `max_length` | same | same |
| **Precision / dtype** | float32 (`torch.float32`, confirmed) | float32 | float32 |
| **Quantisation / ONNX** | none | none | none |
| **`trust_remote_code`** | `False` | **`True`** | `False` |

### E5-base is the **multilingual** variant
Explicitly: `intfloat/multilingual-e5-base` — the **multilingual** model
(100+ languages, XLM-RoBERTa large base). It is **not** `intfloat/e5-base-v2` or
any English-only E5 variant. Its `bge-small-en-v1.5`-style English-only
counterpart was not tested here.

## 2. Input prefixes — exact strings used

These were taken from each model card, **not** assumed:

| Model | Query prefix | Passage/document prefix | Basis |
|---|---|---|---|
| `bge_m3` | `""` (none) | `""` (none) | BGE-M3 card: *"the BGE-M3 model no longer requires adding instructions to the queries"* |
| `tamil_embed` | `"query: "` | `"passage: "` | Tamil-Embed card shows `query:`/`passage:` usage; it is fine-tuned from `multilingual-e5-base` and inherits that convention |
| `e5_base` | `"query: "` | `"passage: "` | E5 documented asymmetric retrieval format |

Prefix is applied as a plain string concatenation to the front of the text, then a
single space, then the original text. Example for `e5_base`:
`"query: " + "why opening with a greeting hurts retention"`.

### Prefix ablation condition
A second condition, `no_prefixes_ablation`, was run for `tamil_embed` and
`e5_base` with **both** prefixes set to `""`. `bge_m3` has no separate ablation —
its documented convention already has no prefix, so a no-prefix run would be a
numerical duplicate of the primary condition. See `dataset_description.md` §8.

**Ablation outcome:** the prefix makes no material difference on this dataset
(e5_base R@3 0.671 prefixed vs 0.698 unprefixed; tamil_embed 0.689 vs 0.707).
This **supersedes** the earlier "no manual prefixes" convention recorded in
ADR-002 §5, which had been inferred from a single similarity pair on a
36-document corpus.

## 3. BGE-M3 retrieval mode

**DENSE ONLY.** `FlagEmbedding`'s `encode_queries` / `encode_corpus` were **not**
used. `bge_m3` was loaded through plain `sentence-transformers`
(`SentenceTransformer("BAAI/bge-m3")`) and `model.encode(...)` was called, which
returns the **dense vector only**.

| BGE-M3 capability | Used here? |
|---|---|
| Dense retrieval | **Yes** — the only mode measured |
| Sparse / lexical weights | **No** |
| ColBERT multi-vector | **No** |

This was a deliberate fairness decision: mixing dense+sparse+ColBERT would have
changed both the retrieval architecture and the storage profile, making the
comparison against the other two dense-only models invalid. The hybrid capability
is noted in the benchmark report as an untested experimental avenue.

## 4. Similarity, batching, seed, device

| Setting | Value |
|---|---|
| Similarity metric | **cosine**, computed as the dot product of L2-normalised vectors (`Q @ D.T`) |
| Ranking | `numpy.argsort(-scores, kind="stable")`, top-5 |
| Index | **in-memory numpy only** — no PostgreSQL, no pgvector, no FAISS |
| Batch size | **16** |
| `max_length` | **512** for all three (fairness pin; see §5) |
| `normalize_embeddings` | `True` (passed to `model.encode`) |
| Device | **CPU** (`device="cpu"`), float32 |
| GPU | An RTX 2050 (4096 MiB) is present in the machine but was **deliberately not used**, so that embedding availability does not depend on a 4 GB laptop GPU |
| Random seed | **UNKNOWN / not set.** No seed was passed to any component. The dataset records `seed = 20260303`, but **no code path consumes it** — there is no sampling anywhere. Model inference here is deterministic, so no seed was required. |

## 5. Fairness pin and its consequence
`bge_m3` natively accepts 8192 tokens. It was pinned to **512** to match the
other two. Consequence: **BGE-M3's long-document capability was never exercised.**
Its numbers here reflect 512-token behaviour only.

## 6. Reproduction-relevant discrepancy (disclosed)
The saved `config` block inside `raw_results.json` records
`pooling: null` and `normalize_module: null` for all three models. That is a
**recording bug in the original runner**, which looked up `model._modules["Pooling"]`
by name; sentence-transformers keys its modules `"0"`, `"1"`, `"2"`, so the lookup
returned `None`. The values in §1 above were obtained by inspecting
`model._modules.values()` and the `Pooling` attributes directly, and are correct.
`normalize_embeddings=True` was also passed explicitly, which is why the
`normalize_module` field being `null` did **not** affect any result.
`dtype` is likewise `UNKNOWN` in the per-model saved config but is `float32`,
recorded in `environment.json` and confirmed via `next(model.parameters()).dtype`.

## 7. Model licences (not dataset licences)
| Model | Licence |
|---|---|
| `Tamil-ai/tamil-embed-base` | apache-2.0 (per model card) |
| `intfloat/multilingual-e5-base` | MIT |
| `BAAI/bge-m3` | MIT |
| `Tamil-ai/tamil-embed-base` base | `intfloat/multilingual-e5-base` |

## 8. Library versions
Python 3.12.15 · sentence-transformers 3.4.0 · transformers 4.57.6 ·
PyTorch 2.14.1+cu130 · numpy 2.5.3 · huggingface_hub (version in
`saved_outputs/environment.json`). OS: Ubuntu 22.04.5 LTS, kernel
6.8.0-138-generic, glibc 2.41.
