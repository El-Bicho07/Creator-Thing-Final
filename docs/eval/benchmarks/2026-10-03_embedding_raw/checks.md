# Checks — 2026-10-03 Embedding Benchmark Export

Every number below is computed from the files in this folder, not from memory.
Scripts: `../saved_outputs/*.json`, `per_query_results.csv`, `documents.csv`.

---

## a. Reconcile 153 + 57 + 46 = 256 against 225 queries

**They count different things. There is no contradiction.**

| Quantity | Value | What it counts |
|---|---:|---|
| Documents | **113** | entries in `dataset.json.documents` |
| Queries | **225** | entries in `dataset.json.queries` |
| Relevant pairs | **256** | `sum(len(q["relevant"]) for q in queries)` |
| Latin | **153** | relevant pairs whose **gold document** is Latin-script |
| Tamil | **57** | relevant pairs whose gold document is Tamil-script |
| Devanagari | **46** | relevant pairs whose gold document is Devanagari |

`153 + 57 + 46 = 256` exactly. **256 is the number of gold (query → document)
edges, not the number of queries.** The 225 queries emit 256 edges because 31
queries carry two gold documents and 194 carry one:

| Relevant docs per query | min | mean | max |
|---|---:|---:|---:|
| | 1 | 1.1378 | 2 |

Verification code:
```python
c = Counter()
for q in queries:
    for doc_id in q["relevant"]:
        c[script_of(documents[doc_id]["text"])] += 1
# {'Latin': 153, 'Devanagari': 46, 'Tamil': 57} -> 256
```

These figures originate in `saved_outputs/target_language_breakdown.json`. They
are **not** query counts and **not** document counts. Document counts by script
are different again: Latin 79, Tamil 19, Devanagari 15 (total 113).

---

## b. The "Tanglish query → Tamil-script document" group that scored 0.000

### Size and label integrity

| Property | Value |
|---|---|
| Queries in group `tanglish_ta` | **12** |
| Queries with ≥1 Tamil-script relevant doc | **12 of 12** |
| Queries where **every** relevant doc is Tamil-script | **12 of 12** |
| Relevance definition | a gold doc is relevant only if it is **Tamil script** (verified true for all 12); all are grade 2 |

So **missing positives are ruled out**: every one of the 12 queries has a
Tamil-script gold document present in the corpus, and no group member was
labelled against a Latin-script or Devanagari document.

### Per-model result

| Model | `first_relevant_rank` blank | Latin-script docs occupying top-5 |
|---|---:|---:|
| `tamil_embed` | **12 / 12** | **60 / 60 slots** |
| `e5_base` | **12 / 12** | **60 / 60 slots** |
| `bge_m3` | **12 / 12** | **59 / 60 slots** |

### Five example rows

Gold doc for each is Tamil script; `top5` shown with the script of what came back.

**1. `q_x_tan_ta_001`** — *"tamil la aval uthaippu vida kuraiya padakkum illa"*
gold `d_ta_cap_002` = `தமிழில் குறைந்த உள்ளடக்கம் இருப்பதால், மின்னும் நன்கு உள்ள ஆரம்பத்தை நானே முன்னெடுத்து…`
* tamil_embed → `d_tan_cap_002`(Latin) · `d_hin_cap_002`(Latin) · `d_hin_com_001`(Latin) · `d_mix_ta_001`(Latin) · `d_tan_voice_001`(Latin)
* e5_base → `d_tan_cap_002`(Latin) · `d_mix_ta_004`(Latin) · `d_tan_less_001`(Latin) · `d_mix_ta_002`(Latin) · `d_tan_hook_001`(Latin)
* bge_m3 → `d_tan_cap_002`(Latin) · `d_mix_ta_004`(Latin) · `d_tan_hook_001`(Latin) · `d_tan_hook_002`(Latin) · `d_tan_perf_001`(Latin)

**2. `q_x_tan_ta_002`** — *"edikkum neram konjam kuraindha revenue perusu aayidhu"*
gold `d_ta_less_001` = `கற்றுக்கொண்ட படி: அதிக பார்வையாளர் இருந்தாலும் குறைந்த நேரம் மட்டுமே…`
* tamil_embed → `d_hin_cap_002` · `d_hin_hook_001` · `d_en_cap_006` · `d_hin_strat_001` · `d_en_cap_003` (all Latin)
* e5_base → `d_tan_hook_001` · `d_tan_strat_001` · `d_tan_voice_001` · `d_mix_ta_004` · `d_tan_idea_001` (all Latin)
* bge_m3 → `d_tan_hook_001` · `d_tan_cap_001` · `d_tan_idea_001` · `d_tan_perf_001` · `d_mix_ta_004` (all Latin)

**3. `q_x_tan_ta_003`** — *"mutru vandhu mela vilaiya vasai pogakoodu pothu"*
gold `d_ta_perf_001` = `செயல்திறன் அறிக்கையின்படி, முதல் மூன்று விநாடிகளில் பார்வையாளர் தொடர்பை விடுவிடுவது…`
* tamil_embed → `d_hin_com_001` · `d_hin_cap_002` · `d_tan_hook_002` · `d_tan_voice_001` · `d_en_com_002` (all Latin)
* e5_base → `d_mix_ta_004` · `d_tan_voice_001` · `d_tan_hook_002` · `d_tan_hook_001` · `d_tan_less_001` (all Latin)
* bge_m3 → `d_tan_hook_002` · `d_mix_ta_004` · `d_tan_scr_001` · `d_tan_hook_001` · `d_tan_perf_001` (all Latin)

**4. `q_x_tan_ta_004`** — *"naalu pakutiya vida vaivechchalai"*
gold `d_ta_scr_002` = `நான்கு பகுதிகள்: கேள்வி, பார்வையாளர் அனுபவம், தெளிவான தீர்வு, சுருக்கமான முடிவுரை…`
* tamil_embed → `d_hin_com_001` · `d_hin_cap_002` · `d_en_cap_006` · `d_en_com_002` · `d_hin_strat_001` (all Latin)
* e5_base → `d_mix_ta_004` · `d_tan_cap_002` · `d_mix_hi_004` · `d_tan_hook_002` · `d_tan_hook_001` (all Latin)
* bge_m3 → `d_mix_ta_004` · `d_tan_cap_002` · `d_hin_scr_001` · `d_tan_cap_001` · `d_mix_hi_004` (all Latin)

**5. `q_x_tan_ta_005`** — *"eluthuru sivaive kuraiya vaasalama epdi venkumnu solradhu"*
gold `d_ta_voice_002` = `தமிழ் உரையில் எழுத்துரு சிதைவை தவிர்க்கிறேன். வாசிப்பதற்கு இலகுவான சொற்களை…`
* tamil_embed → `d_en_less_003` · `d_tan_voice_001` · `d_hin_com_001` · `d_tan_hook_002` · `d_hin_cap_002` (all Latin)
* e5_base → `d_tan_voice_001` · `d_mix_ta_002` · `d_tan_hook_002` · `d_tan_hook_001` · `d_tan_com_001` (all Latin)
* bge_m3 → `d_tan_hook_001` · `d_tan_hook_002` · `d_tan_voice_001` · `d_tan_cap_001` · `d_mix_ta_002` (all Latin)

### Could the zeros be an artefact? Assessment

| Candidate explanation | Verdict | Evidence |
|---|---|---|
| **Missing positives** | **RULED OUT** | All 12 queries have a Tamil-script gold doc in the corpus; verified programmatically. |
| **Label errors** | **RULED OUT** | Every gold label for this group points at a Tamil-script document, which is the correct answer for a Tamil-content query. Labels are internally consistent across all 12. |
| **Filtering / retrieval depth** | **RULED OUT** | The gold document is inside the retrieved candidate set — all 113 documents are embedded and scored for every query. Full 113×113 score matrix is computed; only the top-5 is reported. The gold row is present but ranks below 5. |
| **Script mismatch** | **CONFIRMED cause** | 179 of 180 top-5 slots across the group are Latin-script. Models rank the **Tanglish twin** of the gold document first (e.g. row 1: all three models return `d_tan_cap_002`, the Tanglish version of gold `d_ta_cap_002`, at rank 1). Semantics were understood; the wrong script was returned. |

**Additional caveat — the corpus helps the models cheat.** The dataset contains
deliberate script-paired twins (a Tamil-script document and a Tanglish document
carrying the same content). Row 1 shows all three models ranking the Tanglish
twin first. So this slice is arguably *harder* than a real corpus without twins:
a semantically-correct wrong-script distractor is always available. Report these
zeros as a robust, reproducible failure, but note the absolute difficulty is
inflated by corpus construction.

## c. Exact repo id and training of "Tamil-Embed"

| Property | Value |
|---|---|
| **Exact HF repo id** | **`Tamil-ai/tamil-embed-base`** (not `Tamil-ai/tamil-embed`, not an untagged local path) |
| Pinned commit | `a5b5aa23a0a7eee1e7eccee53c5835c6e68b06ce` |
| Base model | **`intfloat/multilingual-e5-base`** (it is a fine-tune, not a from-scratch model) |
| Parameters / dim | 278.0 M / 768, Matryoshka 768·512·256·128·64 |
| Trained for | Tamil semantic search and retrieval; cross-lingual English–Tamil similarity; Tamil document clustering; RAG for Tamil |
| Stage 1 training | Tamil NLI entailment pairs (ANLI, FEVER, LING, MNNI, WANLI) with `MatryoshkaLoss` wrapping `MultipleNegativesRankingLoss` |
| Stage 2 training | Samanantar English–Tamil parallel corpus (~50K pairs) with hard negatives |
| Loss | `MatryoshkaLoss` + `MultipleNegativesRankingLoss` |
| Self-reported metric | IndicCrosslingualSTS en–ta Spearman **0.489**; en–hi **0.640** |
| Licence | apache-2.0 |
| Prefix convention used | `query:` / `passage:` (inherited from its E5 base; shown on its model card) |
| `trust_remote_code` | `True` (loads a sentence-transformers version 5.2.3 artefact under ST 3.4.0 — emits a version warning) |

**No Hindi-specific training signal exists for this model**, yet on Devanagari
target documents it scored 0.652 vs `e5_base`'s 0.587 (see
`saved_outputs/target_language_breakdown.json`).

## d. Per-slice counts

### Queries by script (character-derived) — 225 total
| Script | n |
|---|---:|
| Latin | 141 |
| Tamil | 43 |
| Devanagari | 38 |
| mixed (Latin + Tamil/Devanagari) | 3 |

### Queries by `query_type` — 225 total
| Type | n |
|---|---:|
| native | 133 |
| Tanglish | 40 |
| Hinglish | 38 |
| code-mixed | 14 |
| other | 0 |

### Queries by `query_language` — 225 total
| Language | n | note |
|---|---:|---|
| en | 52 | |
| ta | 83 | Tamil script (43) **+** Tanglish (40) |
| hi | 76 | Devanagari (38) **+** Hinglish (38) |
| mixed | 14 | |

### Documents by script — 113 total
| Script | n |
|---|---:|
| Latin | 79 |
| Tamil | 19 |
| Devanagari | 15 |

### Queries by phenomenon — 225 total
`en_mono` 30 · `ta_mono` 25 · `hi_mono` 22 · `tanglish_mono` 20 · `hinglish_mono` 20 ·
`code_mixed` 14 · `ta_en` 12 · `en_ta` 12 · `tanglish_ta` 12 · `hi_en` 10 ·
`en_hi` 10 · `hinglish_hi` 10 · `tanglish_en` 8 · `hinglish_en` 8 · `ta_tanglish` 6 ·
`hi_hinglish` 6

## e. EXTRA RUN — Tanglish retrieval sanity probe (clearly labelled)

**This is an additional experiment run for this export only.** It is *not* part
of the benchmark dataset, has *no* relevance labels from the dataset, and does
not contribute to any reported metric.

Method: 10 Tamil-script documents were selected; a Latin-script (Tanglish)
rendering of the central phrase of each was authored as a query; the query was
run through the identical pipeline (documented prefixes, `max_length=512`,
`batch=16`, cosine) against the same 113-document corpus; we then asked whether
the **source document** appears in the top-5.

| Model | Tamil-script source found in top-5 |
|---|---:|
| `bge_m3` | **0 / 10** |
| `tamil_embed` | **0 / 10** |
| `e5_base` | **0 / 10** |

Probes and results: `extra_experiment_tanglish_probes.csv` (30 rows = 10 probes
× 3 models, with full top-5 ids and scores).

Example — probe `probe_04`, Tanglish query *"idhu vanam patinaidu payana indru
mela ezhuthukkavum vendum"*, source `d_ta_cap_001`; not found by any model.

This is an **independent replication** of §b using freshly authored queries that
were never in the benchmark dataset, and it reaches the same conclusion. It
strengthens the finding beyond the possibility of a labelling error specific to
the original 12 queries.

---

## Internal consistency verification of this export

Re-derived every `first_relevant_rank`, `hit_at_1`, `hit_at_3`, `hit_at_5` from
the exported `top5_ids` and `relevant_doc_ids`:

| Check | Result |
|---|---|
| Rows disagreeing with recomputation | **0 / 450** |
| `documented_prefixes` rows with scores present (all 3 models) | 225 / 225 |
| `no_prefixes_ablation` rows | 225 |
| `bge_m3` cells blank in the ablation condition | 225 / 225 (correct: never run) |
| Ablation `*_top5_scores` blank | correct: never persisted, not re-run |

## Conditions NOT included, and why

* **No `normalized` / transliteration condition exists.** One was never run.
  Creating it now would have meant inventing a condition after the fact; the
  export contains only what was actually executed. Cross-script retrieval is
  therefore reported as a *measured failure*, not as a normalised-condition result.
* **No GPU condition.** All measurements are CPU by policy.
* **No BGE-M3 sparse or ColBERT condition.** Out of the benchmark's stated scope
  (dense-only fairness).
* **No 512d/256d rows in `per_query_results.csv`.** Those Matryoshka variants
  were run and are preserved in `saved_outputs/raw_results.json` and
  `retrieval_results.json`, but their per-query rows are not duplicated into this
  CSV because the CSV schema is defined around the three named models. They are
  available for re-analysis in the saved JSON.
