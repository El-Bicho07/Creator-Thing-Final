# Dataset Description — 2026-10-03 Embedding Benchmark

## 1. Provenance and authorship

**Every document and every query in this dataset was written by hand by the AI
agent that built the benchmark, specifically for this evaluation.** Nothing was
scraped, sampled, or copied from any external corpus.

| Property | Value |
|---|---|
| Documents | 113 |
| Queries | 225 |
| Graded relevant pairs (grade 2) | 256 |
| Related pairs (grade 1, used only for nDCG) | 111 |
| Dataset SHA-256 (first 16 hex of concatenated doc texts) | `e24337b5380674b0` |
| Declared random seed | `20260303` (**no sampling is performed anywhere** — see §6) |
| Source repository | `modules/13_Voice_Replicator`, `modules/19_Creator_Second_Brain` were **read** as capability references only; no donor text was copied |

**Not derived from any public dataset.** No MTEB / MIRACL / MLDR / IndicCrosslingualSTS
/ Samanantar / BEIR data was used for the documents or queries. Consequently **no
third-party dataset licence applies to this corpus**. (The *models* have their own
licences — see `model_config.md` §7.)

## 2. What the documents are

They imitate the artifact types the Creator Platform actually stores and searches:
creator captions, hooks, short-form video scripts, content ideas, audience
comments, creator voice/style samples, content-strategy notes, lessons learned,
historical performance insights, reusable snippets, and memory/RAG chunks.

| Documents by `language` label | n | | Documents by `script` (character-derived) | n |
|---|---:|---|---|---:|
| en | 45 | | Latin | 79 |
| ta (Tamil script) | 19 | | Tamil | 19 |
| hi (Devanagari) | 15 | | Devanagari | 15 |
| tanglish | 12 | | | |
| hinglish | 12 | | | |
| code_mixed_ta | 4 | | | |
| code_mixed_hi | 4 | | | |
| code_mixed_en | 2 | | | |

By content category: caption 20, hook 20, memory 18, script 11, comment 10,
strategy 9, performance 7, idea 8, voice 6, snippet 5.

**Note on a deliberate corpus property.** The corpus contains *script-paired twins*:
several Tamil-script documents have a Tanglish counterpart carrying the same content
(e.g. `d_ta_cap_002` in Tamil script and `d_tan_cap_002` in Tanglish), and likewise
for Hindi/Devanagari vs Hinglish. This was unintentional but it has a strong
effect on cross-script retrieval — it hands every model a semantically-correct
*wrong-script* distractor. It therefore makes the cross-script failure
**unambiguous** (see `checks.md` §b) while making that slice harder than a
real-world corpus might be. Treat cross-script numbers as a **lower bound on
difficulty**, not as a neutral estimate.

## 3. Who wrote the queries and relevance labels

**Author: the same AI agent, by hand. No LLM generated relevance labels at scale,
no human annotators, no templates.**

* **Query text** — authored directly per phenomenon, deliberately *paraphrased*
  rather than copied from the target document.
* **Relevance labels** — assigned by the author while writing each query, as a
  `relevant` list (grade 2) and an optional `related` list (grade 1).
* **Graded relevance semantics** — grade 2 = the document a creator would consider
  a correct answer to the query; grade 1 = adjacent/useful context that is not
  itself the answer. nDCG@5 uses gains (2, 1, 0) with the standard
  `log2(rank+1)` discount and an ideal-sort gain vector.

This is the **principal limitation of the dataset**: labels are single-author,
unblinded and unverified by a second party. There is no inter-annotator agreement
statistic because there is only one annotator. See `checks.md`.

### 3.1 Label checking actually performed

`scripts/top3_benchmark/build_dataset.py` ran automated checks **before any model
was loaded**. It found and forced the fix of **15 real defects**:

| Check | Result |
|---|---|
| Duplicate document ids | PASS |
| Duplicate query ids | PASS |
| Duplicate query text | PASS |
| Every relevance label resolves to a real document id | PASS |
| Every query has ≥1 relevant document | PASS |
| No id simultaneously in `relevant` and `related` | PASS |
| **Leakage:** no query string appears verbatim inside any document it labels | **15 violations found → all rewritten → PASS** |
| Near-duplicate contamination (≥0.85 Jaccard token overlap, query vs its own gold doc) | none remaining |

Example of a caught leak: query `"har post me energy invest nahi hoti"` was a
verbatim substring of `d_hin_hook_001`. It was rewritten to
`"daily posting se energy drain nahi hona chahiye"`.

**Not performed:** human validation, second-annotator agreement, or any check that
the relevance judgement matches what a real creator would want.

## 4. Relevant documents per query

| Statistic | Value |
|---|---:|
| Minimum | 1 |
| Mean | 1.1378 |
| Maximum | 2 |
| Queries with exactly 1 relevant | 194 |
| Queries with exactly 2 relevant | 31 |

No query has zero relevant documents.

## 5. Were queries derived from document text?

**No — deliberately.** Every query was authored as an independent paraphrase.
The automated leakage check in §3.1 enforces that no query string is a verbatim
substring of any document it labels. Near-duplicate detection (≥0.85 token
overlap between a query and its own gold document) reports no remaining cases.

However, queries were written **with knowledge of the documents** (the author read
the corpus while writing them). This is *query-aware authoring*, not leakage, but
it does mean absolute scores reflect an easier-than-real pairing than a query set
built independently of the corpus would give.

## 6. Filtering, deduplication, train/test split

| Step | Performed? |
|---|---|
| Filtering / pruning of documents or queries | **No** — all 113 / 225 were retained |
| Deduplication of documents | **No** beyond the duplicate-id check; near-duplicate documents were intentionally kept (script twins, §2) |
| Deduplication of queries | Duplicate exact query text: checked, none present |
| Train / test / dev split | **Not applicable and not performed.** This is an inference-only evaluation of frozen, externally pretrained models. No model was fine-tuned, so there is no training set to leak into. |
| Random sampling | **None.** The `seed = 20260303` in `dataset.json` is recorded for provenance but is **inert** — no code path in the benchmark or the export consumes it. |

## 7. Exact definitions of every count in the report

### "113 documents"
`len(dataset["documents"])` — the number of entries in the `documents` array of
`dataset.json`, each with a unique `id`. Equals the row count of `documents.csv`.

### "225 queries"
`len(dataset["queries"])` — entries in the `queries` array, each with a unique
`id` and unique text. Under the `documented_prefixes` condition this is the row
count of `per_query_results.csv`; the file has **450 rows** because each query
appears once per condition (2 conditions, §8).

### "Latin 153, Tamil 57, Devanagari 46" — the most easily misread number
These three numbers are **NOT query counts and NOT document counts.** They count
**relevant-document pairs** (query → gold-document edges), i.e. entries of the
`relevant` lists:

```
sum over queries of (number of ids in that query's relevant list) = 256
attributed to each pair by the script of the GOLD document's text:
   Latin      153
   Tamil       57
   Devanagari  46
   ----------------
   total      256
```

They come from `target_language_breakdown.json`, computed as:

```python
for q in queries:
    for doc_id in q["relevant"]:
        bucket[script_of(documents[doc_id]["text"])] += 1
```

Because most queries have exactly one gold document, these numbers track the
*gold-document* distribution much more closely than the query distribution.
Full reconciliation in `checks.md` §a.

### Script classification used everywhere
Character-range test, in this priority order:
1. contains Tamil block `U+0B80–U+0BFF` **and** Latin letters → `mixed`
2. contains Devanagari `U+0900–U+097F` **and** Latin letters → `mixed`
3. Tamil block only → `Tamil`
4. Devanagari only → `Devanagari`
5. Latin letters only → `Latin`
6. otherwise → `other`

### `query_language` (en / ta / hi / mixed)
Mapped from the dataset's recorded `lang` field:
`en→en`; `ta→ta`; `hi→hi`; `tanglish→ta`; `hinglish→hi`;
`code_mixed_ta|code_mixed_hi|code_mixed_en→mixed`.

**Consequence worth knowing:** `ta` therefore counts both Tamil-script *and*
Tanglish queries (83 total), and `hi` counts both Devanagari *and* Hinglish
(76 total). Use the `query_script` column to separate script populations.

### `query_type`
Uses the recorded `lang` first, then character script:
`code_mixed_*` → `code-mixed`; script `mixed` → `code-mixed`;
`lang=tanglish` → `Tanglish`; `lang=hinglish` → `Hinglish`;
script `Tamil`/`Devanagari` → `native`; `lang=en` → `native`; else `other`.

`Hinglish` is reported as a distinct value; the export brief listed only
`native/Tanglish/code-mixed/other`, but collapsing Hinglish into "other" would
hide 38 queries of a phenomenon the benchmark exists to measure.

Resulting distribution: native 133, Tanglish 40, Hinglish 38, code-mixed 14.

## 8. Conditions included in `per_query_results.csv`

| `condition` | Models populated | Scores present? | Origin |
|---|---|---|---|
| `documented_prefixes` | all three | **yes** | the primary saved benchmark run; scores recovered by a verified re-run (§ `repro.md`) |
| `no_prefixes_ablation` | `tamil_embed`, `e5_base` only | **no — blank** | genuinely run and saved (ids/rank/hits), but scores were never persisted and were **not** re-run |

**`bge_m3` is intentionally blank in the ablation rows.** BGE-M3's *documented*
convention is already "no prefix", so a `no_prefixes_ablation` condition for it
would be numerically identical to `documented_prefixes`, i.e. a duplicate row.
It was never run as a separate condition. Leaving it blank avoids fabricating a
condition.

## 9. Sanitisation and privacy

**Nothing was removed, because nothing needed to be.** The corpus is synthetic and
self-authored; it contains no real creators' posts or comments.

An automated scan over all document and query text found:

| Pattern searched | Matches |
|---|---:|
| Email addresses | **0** |
| URLs (`http://`, `https://`, `www.`) | **0** |
| `@handles` | **0** |
| Phone-number-shaped digit runs | **0** |
| Digit runs ≥9 (long account ids) | **0** |

Consequently `documents.csv` includes the **full text** of every document
(`text_included = yes`, `sanitisation_applied = none_required_synthetic_selfauthored_no_pii`).
A text hash would **not** be anonymisation and was therefore not used as a
substitute for text.

Model names, Hugging Face repo ids and commit SHAs appear in these files; those
are public identifiers, not personal data.

**No API key, token or `.env` value appears anywhere in this export.** The export
reads only `dataset.json`, `raw_results.json`, `benchmark_config.json`,
`environment.json`, `integrity_report.json` and the recovery JSON, none of which
contain credentials. `environment.json` was machine-generated and contains only
hardware, library versions and model commit hashes.
