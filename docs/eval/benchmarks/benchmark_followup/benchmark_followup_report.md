# Embedding Follow-up Evaluation — Dataset Quality & Cross-Script Normalization

**Date:** 2026-10-03
**Models:** `BAAI/bge-m3`, `Tamil-ai/tamil-embed-base`, `intfloat/multilingual-e5-base`
**Production embedding configuration:** **UNCHANGED**
**Final ruling:** `EMBEDDING MODEL DECISION: PENDING`

---

## 1. Objective

Two focused follow-up evaluations, deliberately **not** a full re-run of the
three-model benchmark:

* **Evaluation A — dataset quality.** Is the synthetic Tamil/Tanglish corpus
  trustworthy enough to support a production embedding decision?
* **Evaluation B — cross-script retrieval.** Can script
  normalization/transliteration materially improve retrieval, especially
  Tanglish → Tamil and Hinglish → Hindi, without substantially damaging
  same-script retrieval?

The purpose is to determine whether dataset quality and the cross-script
normalization problem **materially change the interpretation** of the existing
benchmark — not to select a new model.

---

## 2. Existing Evidence (restated, not revised)

The prior independent re-analysis established:

| Model | R@3 | MRR@5 |
|---|---:|---:|
| BGE-M3 | 0.711 | 0.651 |
| Tamil-Embed | 0.689 | 0.588 |
| E5-base | 0.671 | 0.607 |

These reproduce **exactly** in this study's `raw` condition (§5), which confirms
the harness is sound.

Constraints carried forward unchanged:

* BGE-M3 has a statistically established **R@1** advantage over Tamil-Embed.
* **R@3 is not statistically distinguishable** between any pair. The claim
  "BGE-M3 is ahead across the major retrieval metrics" is **not** repeated here.
* "Tamil-Embed is not best on Tamil" is **not** supported: on Tamil query →
  Tamil document, BGE-M3 and E5-base both reach R@3 = 0.80 against Tamil-Embed's
  0.72.
* The no-prefix E5 ablation is not statistically conclusive. The documented
  `query:` / `passage:` configuration is kept. **ADR-002 is not changed.**
* 225 = queries. 256 = query→gold pairs (31 queries have two gold documents).

---

## 3. Dataset Validation

### What was done
A deterministic 30-pair sample was drawn (15 Tamil-related, 15 Tanglish-related;
seed `20261003`, reproducible). See `dataset_validation_sample.csv`.

### What was NOT done
**No human validation was performed. No reviewer results were fabricated.**

* Pairs reviewed by a human: **0 / 30**
* `human_validation_results.csv` is **deliberately absent** and must only be
  created when a real reviewer submits judgements.
* Tamil naturalness: **UNKNOWN**
* Tanglish naturalness: **UNKNOWN**
* Gold-label correctness: **UNKNOWN**
* Inter-annotator agreement: **UNKNOWN** (no second annotator exists)

### One real defect found, by script
A Unicode block scan over all 338 items found **2 items containing Chinese
characters inside Tamil-English text**:

| Item | Contamination | Intended sense |
|---|---|---|
| `d_tan_idea_001` | `针对性的` | "targeted" |
| `q_x_tan_en_008` | `不及` | "not as good as" |

Both sit in the Tanglish/code-mixed region — the same region as the cross-script
failure. ~0.6% contamination from one automated pass, and a **lower bound**:
a script-block scan cannot detect an English word swapped for a Tamil one, or a
fluent-but-wrong Tamil sentence.

### Sample-size reality
The slices that matter are small:

| Slice | n |
|---|---:|
| All queries | 225 |
| **All cross-script** | **44** (not 225) |
| └ Tanglish → Tamil-script | **12** |
| └ Hinglish → Devanagari | 10–11 |
| Tanglish queries whose gold is *Tanglish*-script (not cross-script) | 28 |
| Hinglish queries whose gold is *Hinglish*-script (not cross-script) | 27 |

Most Tanglish/Hinglish queries are **not** cross-script pairs at all. Reporting
"Tanglish performance" as one number conflates two different tasks.

**Conclusion:** the dataset is **not suitable as the sole basis for a final
embedding-model decision**, though it supports the large directional finding
(§8). Full detail in `dataset_quality_status.md`.

---

## 4. Normalization Method

Full detail in `normalization_methodology.md`.

| Item | Value |
|---|---|
| **NORMALIZATION TOOL** | `indic-transliteration` **2.3.75** (IndicTrans/Sanscript lineage) |
| Installation | isolated venv on host; **never** in the API container |
| Tamil scheme | `optitrans_dravidian` |
| Devanagari scheme | `iast` |
| Scheme selection | empirical round-trip fidelity on this corpus's own native text, **not** chosen by assumption |
| Query/document treatment | **Option A** = queries only (production-feasible); **Option B** = both (diagnostic) |

**Availability check (Part C).** No Indic transliteration library was installed
on the host **or** in the container. `importlib.util.find_spec` produced a false
positive; `importlib.import_module` was used as the authoritative test and all
candidates fail to import. Nothing is vendored in the repo. PyPI was reachable,
and the canonical library is a 159 KB pure-Python wheel with no ML dependency —
so it is not a "large new dependency". Installing the maintained library was
preferred over writing a bespoke transliterator, which Part C warns against.

**Query/document option, chosen on architecture grounds.** The Creator Platform
embeds memories **once at write time**. Option A (queries only) is therefore the
only option that fits without re-embedding stored memories or a production
migration. Option B requires re-embedding every memory; Option C doubles the
write path. Option A is the headline condition; B is reported as a diagnostic.

**Oracle language identifier (important).** Option A must know the query's
language to pick a target script, and this implementation uses the dataset's
recorded `query_language` field — **oracle information unavailable at query
time**. In production this needs a language identifier whose errors would be
*fatal, not graceful* (mistransliterating an English query into Tamil yields
nonsense). This risk is **not measured**. Option B needs no language ID at all.

### Measured limitation of the tool
Formal romanization schemes do not handle colloquial Tanglish:

| Input | Output | Verdict |
|---|---|---|
| `opening la greeting venuma illa` | `ஒபெநிங்க் ல க்ரீதிங்க் வேநும இல்ல` | English loanwords mangled |
| `moodhalnaal` | `மோஓதல்நால்` | double-`o` artefact |
| `vanakkam` | `வநக்கம்` | retroflex `ண` → `ன` |

Hinglish → Devanagari is better (`bahut accha hai` → `बहुत् अच्च है`), but still
imperfect (`maine video banaya` → `मैने विदेओ बनय`).

---

## 5. Raw Results

`raw` condition reproduces the saved benchmark exactly (hard gate: 0 mismatches
for all 3 models × 225 queries). Per-query metrics, matching the original
definition (hit if **any** gold in top-k):

| Slice | Model | R@1 | R@3 | R@5 | MRR@5 |
|---|---|---:|---:|---:|---:|
| Overall (n=225) | bge_m3 | 0.578 | **0.711** | 0.773 | **0.651** |
| Overall (n=225) | tamil_embed | 0.484 | **0.689** | 0.751 | **0.588** |
| Overall (n=225) | e5_base | 0.538 | **0.671** | 0.729 | **0.607** |

R@3/MRR@5 match the original benchmark to three decimals — independent
confirmation of the harness.

---

## 6. Normalized Results

| Condition | Model | R@1 | R@3 | R@5 | MRR@5 |
|---|---|---:|---:|---:|---:|
| `norm_q_to_script` (Option A) | bge_m3 | 0.493 | 0.649 | 0.707 | 0.577 |
| `norm_q_to_script` (Option A) | tamil_embed | 0.364 | 0.564 | 0.622 | 0.465 |
| `norm_q_to_script` (Option A) | e5_base | 0.409 | 0.556 | 0.622 | 0.486 |
| `norm_all_to_latin` (Option B) | bge_m3 | 0.449 | 0.542 | 0.587 | 0.497 |
| `norm_all_to_latin` (Option B) | tamil_embed | 0.351 | 0.436 | 0.480 | 0.399 |
| `norm_all_to_latin` (Option B) | e5_base | 0.400 | 0.440 | 0.471 | 0.425 |

**Every normalized condition is worse than raw on every overall metric.**

### Part D — all 11 required directions (R@5)

| Direction | n | bge_m3 raw→A | tamil_embed raw→A | e5_base raw→A |
|---|---:|---|---|---|
| Tanglish → Tamil doc | 12 | 0.000 → **0.250** | 0.000 → 0.083 | 0.000 → 0.083 |
| Tanglish → English doc | 29 | 0.724 → **0.310** | 0.690 → **0.138** | 0.690 → **0.241** |
| Tamil → Tanglish doc | 21 | 0.714 → 0.714 | 0.619 → 0.619 | 0.571 → 0.571 |
| Tamil → Tamil doc | 31 | 0.742 → 0.742 | 0.645 → 0.645 | 0.677 → 0.677 |
| Hinglish → Devanagari doc | 11 | 0.455 → 0.364 | 0.182 → 0.182 | 0.182 → 0.273 |
| Hinglish → English doc | 29 | 0.828 → **0.621** | 0.862 → **0.345** | 0.828 → **0.345** |
| Hindi → Hinglish doc | 24 | 0.750 → 0.750 | 0.792 → 0.792 | 0.750 → 0.750 |
| Hindi → Hindi doc | 22 | 0.818 → 0.818 | 0.727 → 0.727 | 0.727 → 0.727 |
| English → English doc | 38 | 0.868 → 0.868 | 0.842 → 0.842 | 0.895 → 0.895 |
| Tamil → English doc | 50 | 0.720 → **0.480** | 0.660 → **0.340** | 0.640 → **0.380** |
| Hindi → English doc | 53 | 0.792 → **0.679** | 0.830 → **0.547** | 0.792 → **0.528** |

---

## 7. Paired Comparisons

Paired at the (query, gold) level. 10 000-resample paired bootstrap + exact
McNemar. A difference is called real only if the 95% CI excludes zero **and**
permutation p < 0.05. Full table in `statistical_comparison.md`.

### Option A — `norm_q_to_script`

| Model | Slice | Metric | Raw | Norm | Diff | 95% CI | Verdict |
|---|---|---:|---:|---:|---:|---|---|
| bge_m3 | Tanglish→Tamil | R@5 | 0.000 | 0.250 | +0.250 | [+0.000, +0.500] | **not real** (p=0.248) |
| tamil_embed | Tanglish→Tamil | R@5 | 0.000 | 0.083 | +0.083 | [+0.000, +0.250] | **not real** (p=1.000) |
| e5_base | Tanglish→Tamil | R@5 | 0.000 | 0.083 | +0.083 | [+0.000, +0.250] | **not real** (p=1.000) |
| bge_m3 | all cross-script | R@5 | 0.521 | 0.562 | +0.042 | [-0.083, +0.167] | **not real** |
| tamil_embed | all cross-script | R@5 | 0.458 | 0.479 | +0.021 | [-0.062, +0.104] | **not real** |
| e5_base | all cross-script | R@5 | 0.375 | 0.417 | +0.042 | [-0.042, +0.125] | **not real** |
| bge_m3 | same-script | R@5 | 0.788 | 0.702 | **-0.087** | [-0.130, -0.043] | **REAL REGRESSION** |
| tamil_embed | same-script | R@5 | 0.760 | 0.611 | **-0.149** | [-0.202, -0.101] | **REAL REGRESSION** |
| e5_base | same-script | R@5 | 0.760 | 0.630 | **-0.130** | [-0.183, -0.082] | **REAL REGRESSION** |
| bge_m3 | overall | R@5 | 0.738 | 0.676 | -0.062 | [-0.105, -0.023] | **REAL REGRESSION** |
| tamil_embed | overall | R@5 | 0.703 | 0.586 | -0.117 | [-0.164, -0.074] | **REAL REGRESSION** |
| e5_base | overall | R@5 | 0.688 | 0.590 | -0.098 | [-0.141, -0.055] | **REAL REGRESSION** |

### Option B — `norm_all_to_latin`

| Model | Slice | Metric | Raw | Norm | Diff | 95% CI | Verdict |
|---|---|---:|---:|---:|---:|---|---|
| bge_m3 | all cross-script | R@5 | 0.521 | 0.146 | -0.375 | [-0.542, -0.188] | **REAL REGRESSION** |
| tamil_embed | all cross-script | R@5 | 0.458 | **0.000** | -0.458 | [-0.604, -0.312] | **REAL REGRESSION** |
| e5_base | all cross-script | R@5 | 0.375 | **0.000** | -0.375 | [-0.521, -0.250] | **REAL REGRESSION** |
| tamil_embed | overall | R@5 | 0.703 | 0.441 | -0.262 | [-0.320, -0.203] | **REAL REGRESSION** |
| e5_base | overall | R@5 | 0.688 | 0.430 | -0.258 | [-0.312, -0.203] | **REAL REGRESSION** |

**No comparison in this study supports adopting normalization.**

---

## 8. Tanglish Analysis

The original result: **Tanglish → Tamil, n = 12, R@5 = 0.000 for all three
models.** Per-query evidence in `tanglish_12_analysis.csv`.

### Did normalization change it?

| Model | raw | Option A | Option B |
|---|---:|---:|---:|
| bge_m3 | 0/12 | **3/12** | 0/12 |
| tamil_embed | 0/12 | 1/12 | 0/12 |
| e5_base | 0/12 | 1/12 | 0/12 |

**Partially, but not convincingly.** For bge_m3 the McNemar cell is 3/0 — three
queries recovered, none lost — yet the 95% CI is [+0.000, +0.500] with exact
p = 0.250. At n = 12 this is **not** distinguishable from no effect. Option B
did not recover anything.

### The apparent gain is orthographic, not semantic

The three queries bge_m3 recovered under Option A:

| Query | Original Tanglish | "Normalized" |
|---|---|---|
| `q_x_tan_ta_001` | `tamil la aval uthaippu vida kuraiya padakkum illa` | `தமில் ல அவல் உதைப்பு வித குரைய பதக்கும் இல்ல` |
| `q_x_tan_ta_004` | `naalu pakutiya vida vaivechchalai` | `நாலு பகுதிய வித வைவெச்சலை` |
| `q_x_tan_ta_006` | `paruvaiga|k keeleerukkum illa endha keluppadi theriyum` | `பருவைக।க் கீலீருக்கும் இல்ல எந்த கெலுப்பதி தெரியும்` |

These are **lexically wrong** (`tamil` → `தமில்`, `vida kuraiya` →
`வித குரைய`). `q_x_tan_ta_006` even gained a spurious Devanagari danda
(`।`) — another transliteration artefact. The gold was retrieved not because
the text was correctly Tamil but because the mangled output happens to share
**character-level** statistics with Tamil-script documents.

That is a shallow lexical-overlap effect, not evidence that normalization
improved cross-lingual understanding. It is also unstable: it depends on
producing orthographically-Tamil-looking noise.

### Root cause of the original 0/12
Script-lock: the models rank Latin-script matches overwhelmingly for
Latin-script queries, so a Tanglish query pulls its Tanglish-script twins into
the top-5 and the Tamil-script gold never surfaces. Recall matters here — the
gold document *was* embedded and scored; it simply ranked below 5. It is **not**
caused by filtering, missing positives or label errors.

---

## 9. Hindi / Hinglish Analysis

**The same class of failure exists for Devanagari, but it is much weaker.**

Raw Hinglish → Devanagari R@5: bge_m3 **0.455**, tamil_embed 0.182,
e5_base 0.182. That is *not* the uniform 0.000 seen for Tanglish → Tamil — so
Hinglish → Hindi is a partial-success case, not a categorical failure. Two
independent explanations:

1. The formal Hinglish orthography the transliterator expects is closer to
   colloquial Hinglish than Tanglish is to formal romanization, so the tool
   behaves better (§4).
2. bge-m3 already handles part of this cross-script gap natively.

Normalization did not help meaningfully: +0.000 to +0.091 at n = 11, all CIs
straddling zero (p = 1.000). bge_m3's raw advantage here (0.455 vs 0.182) is
itself not statistically established at this sample size.

Note the corpus contains one Hinglish query with a *mixed* Devanagari+Latin gold
set, which is why the pair count (11) differs from the query count (10).

---

## 10. Same-Script Regression — CRITICAL

**Normalization improves cross-script retrieval nowhere significantly, and
damages same-script retrieval significantly and substantially.**

Option A, same-script control (n = 208), R@5: **-0.087 / -0.149 / -0.130**,
p ≤ 0.0002 for all three models. Overall: **-0.062 / -0.117 / -0.098**,
p ≤ 0.005.

The mechanism is precisely identified, because native-script → native-script
retrieval is **completely untouched** (a correct internal control — Option A
never rewrites an already-native query):

| Unchanged control | n | R@5 identical before/after |
|---|---:|---|
| English → English | 38 | ✔ 0.868 / 0.842 / 0.895 |
| Tamil → Tamil | 31 | ✔ 0.742 / 0.645 / 0.677 |
| Hindi → Hindi | 22 | ✔ 0.818 / 0.727 / 0.727 |

The damage is **entirely** on Latin-script queries retrieving Latin/English
documents — the majority use case, since 79 of 113 documents are Latin script:

| Direction | n | bge_m3 | tamil_embed | e5_base |
|---|---:|---|---|---|
| Hinglish → English | 29 | 0.828 → **0.621** | 0.862 → **0.345** | 0.828 → **0.345** |
| Tanglish → English | 29 | 0.724 → **0.310** | 0.690 → **0.138** | 0.690 → **0.241** |
| Tamil → English | 50 | 0.720 → **0.480** | 0.660 → **0.340** | 0.640 → **0.380** |
| Hindi → English | 53 | 0.792 → **0.679** | 0.830 → **0.547** | 0.792 → **0.528** |

**Why.** Tanglish and Hinglish queries are lexically *English*. Forcing them
into Tamil/Devanagari script destroys lexical overlap with English documents:
`greeting` → `க்ரீதிங்க்` shares no subword with any English document. The
transformation touches 78 of 225 queries and destroys a large share of their
retrievals.

This asymmetry explains the whole result: the cross-script slice is **12
queries**; the damaged slice is **over 100**. The experiment trades a small,
unreliable gain for a large, highly reliable loss.

Option B is worse still — cross-script R@5 falls to exactly **0.000** for two
models, and it also destroys same-script native retrieval (`Hindi → Hindi` drops
to 0.318 for e5_base). `optitrans_dravidian` emits heavily diacritic-laden Latin
(`தமிழில்` → `dhami.Lil`, `குறைந்த` → `ghu.Rhaindha`) whose tokenisation is
unlike anything in these models' training distribution.

---

## 11. Dataset Limitations

| Limitation | Status |
|---|---|
| Synthetic generation | **Entire corpus** written by one AI agent |
| Single-agent query generation | Yes; queries authored with the corpus visible |
| Human validation | **None.** 0/30 pairs reviewed; naturalness UNKNOWN |
| Gold-label correctness | **UNKNOWN** — labels assigned by the corpus author |
| Inter-annotator agreement | **UNKNOWN** — no second annotator |
| Tanglish → Tamil sample size | **n = 12** — cannot resolve 0→3/12 |
| All cross-script sample size | **n = 44** — too small to rank three models |
| Language-quality concerns | 2 confirmed CJK contaminations (~0.6%); script-block scan is a lower bound |
| Paraphrase leakage | 15 verbatim overlaps caught pre-run; semantic overlap cannot be ruled out |
| Script-paired twins | Corpus contains script twins, making cross-script *harder* than reality |
| Oracle language ID | Option A used dataset labels; production language-ID errors **not measured** |
| No human rating of the "normalized" text | The pseudo-Tamil in §8 was never reviewed by a Tamil speaker |

Two further caveats: the benchmark was never validated against **real** Tamil
content, so it cannot speak to production query distributions; and the
normalization tool's outputs were never linguistically reviewed, only measured.

---

## 12. Recommendation

**No embedding model is selected. Production remains unchanged.**

**1. Did normalization materially improve cross-script retrieval?**
**No.** All cross-script CIs include zero (p = 0.63–1.00). The best case,
bge_m3 on Tanglish → Tamil, is +0.250 with CI [+0.000, +0.500], p = 0.248 — the
right direction, not a demonstrated effect.

**2. Which language/script benefited?**
**None, significantly.** The nominal gain is confined to Tanglish → Tamil for
bge_m3 (3/12) and appears to be orthographic coincidence rather than improved
linguistic handling. Hinglish → Devanagari showed no change (n = 11).

**3. Did same-script retrieval regress?**
**Yes — significantly and materially.** -0.087 to -0.149 (p ≤ 0.0002) on the
same-script control, -0.062 to -0.117 overall. The regression is concentrated on
Latin-query → English-document, the dominant real path.

**4. Is the dataset trustworthy enough for a production embedding decision?**
**No.** 0 human-validated pairs, unknown gold-label correctness, no inter-annotator
agreement, and a 12-query slice carrying the headline conclusion.

**5. Is another benchmark required?**
**Yes.** Before any model decision: (a) ≥2 independent Tamil-speaking reviewers
with reported Cohen's κ; (b) fix the 2 CJK artefacts; (c) substantially larger
cross-script slices — n = 12 cannot decide anything; (d) include real consented
Tamil/Tanglish content; (e) a **script-aware** baseline that separates script
mismatch from language mismatch, since that is the actual failure mode here.

**6. Should production remain unchanged?**
**Yes — unchanged.** `vector(384)`, the current production embedding
configuration, no migration, no Module 13/19 re-embedding, no Phase 2 work, and
**ADR-002 not changed** (the no-prefix E5 ablation remains inconclusive).

### The genuinely useful finding
The failure is **not** a language-modeling failure, and it is **not** fixable by
transliteration. It is a **script** failure: the models match script first and
semantics second. `bge-m3` retains a R@1 advantage but none of the three is
reliably better at cross-script retrieval. If cross-script retrieval matters for
Tamil/Hinglish users, the productive direction is **script-aware indexing or
routing** (detect a Latin-script Tamil query and expand it with a genuine
Tanglish↔Tamil lexical resource), **not** scheme-based transliteration — this
study shows that transliteration actively harms the dominant path.

### Honest bottom line
This follow-up **does not change the interpretation of the existing benchmark**.
It does not support a model switch, and it does not support normalization. It
also does not overturn the existing model ranking — it confirms that R@3
differences remain statistically indistinguishable while adding strong evidence
that the corpus is unfit for a final production decision.

```
EMBEDDING MODEL DECISION: PENDING
```

---

## Appendix — output files

| File | Contents |
|---|---|
| `dataset_validation_sample.csv` | 30 deterministic pairs, no PII |
| `HUMAN_VALIDATION_INSTRUCTIONS.md` | rubric for a real Tamil-speaking reviewer |
| `dataset_quality_status.md` | validation status and fitness assessment |
| `normalization_methodology.md` | tool, versions, schemes, pipeline, limitations |
| `normalized_results.csv` | overall metrics × 3 conditions × 3 models |
| `cross_script_results.csv` | 17 slices (incl. all 11 Part D directions) |
| `tanglish_12_analysis.csv` | per-query top-5 for the 0/12 case, both strategies |
| `statistical_comparison.md` | paired CIs, p-values, verdicts |
| `benchmark_followup_report.md` | this report |
| `reproducibility.md` | seeds, environment, exact commands, verify proof |

Machine artefacts supporting reproduction (not deliverables):
`normalized_inputs.json`, `raw_retrieval.json`, `statistics.json`,
`validation_seed.txt`.

**Not created, deliberately:** `human_validation_results.csv` (no reviewer
exists) and `tanglish_10_sanity.csv` (its precondition — reliable normalization
tooling — failed; an equivalent 10-document probe already exists in the prior
export at 0/10 for all three models).