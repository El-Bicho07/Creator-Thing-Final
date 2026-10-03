# Dataset Quality Status — Tamil / Tanglish Benchmark Data

**Status date:** 2026-10-03
**Subject:** the corpus behind the Top-3 embedding benchmark
(113 documents, 225 queries, 256 query→gold pairs)

## Summary judgement

| Question | Answer |
|---|---|
| Has human validation happened? | **NO** |
| Pairs validated by a human | **0 / 30** (sample drawn, not reviewed) |
| Is Tamil naturalness known? | **UNKNOWN** |
| Is Tanglish naturalness known? | **UNKNOWN** |
| Is the dataset suitable for a **final** model selection? | **NO — not on current evidence** |
| Is it usable for the narrower claims already made? | **YES, with stated caveats** |

## What is known

### Provenance
* Every document and query was authored by **one AI agent** (`scripts/top3_benchmark/`).
* No real creator content, user data or third-party dataset was used. The corpus is synthetic.
* Generation happened in a single pass with no reviewer in the loop.

### Structural integrity (scripted, reproducible)
These were verified mechanically and are trustworthy:

| Check | Result |
|---|---|
| Queries | 225 |
| Documents | 113 |
| Query→gold pairs | 256 |
| Queries with 2 gold documents | 31 |
| Privacy scan (email / URL / handle / phone / 9+ digits) | 0 hits |
| Headline metrics re-derivable from saved top-5 IDs | yes, 0 disagreements across 450 rows |

### One real defect found, by script
A Unicode block scan across all 338 items found **2 items containing Chinese
characters inside Tamil-English text** — generator artefacts, not real Tanglish:

| Item | Contamination | Intended sense |
|---|---|---|
| `d_tan_idea_001` | `针对性` | "targeted" |
| `q_x_tan_en_008` | `不及` | "not as good as" |

Both sit in the Tanglish / code-mixed region — the same region as the headline
cross-script failure. 2/338 ≈ **0.6%** contamination rate from one automated
pass. This is a *lower bound*: a script-block scan cannot detect an English word
substituted for a Tamil one, or a fluent-but-wrong Tamil sentence.

## What is NOT known

* **Tamil grammatical and idiomatic naturalness — UNKNOWN.** No native speaker
  has judged any query or document.
* **Tanglish naturalness — UNKNOWN.** Tanglish has no standard orthography, so
  "correct" is a judgement call that must be made by a human reader.
* **Gold-label correctness — UNKNOWN.** Relevance was assigned by the same agent
  that wrote the documents, so a mislabelled pair is entirely possible and would
  silently depress every model's score.
* **Inter-annotator agreement — UNKNOWN / not computed.** No second annotator
  exists. With one author and one label source, there is no agreement data to
  report.
* **Paraphrase leakage — UNKNOWN.** Queries were written with the corpus visible.
  A scripted near-duplicate check was run at build time and 15 obvious verbatim
  overlaps were rewritten, but semantic overlap cannot be ruled out.

## Sample-size reality

The slices that matter for the cross-script question are small:

| Slice | n |
|---|---:|
| All queries | 225 |
| Latin-script query → non-Latin-script gold (**all cross-script**) | **44** |
| ├ native Latin query → non-Latin gold | 22 |
| ├ **Tanglish → Tamil-script** | **12** |
| └ Hinglish → Devanagari | 10 |
| Tanglish queries with a *Tanglish*-script gold (not cross-script) | 28 |
| Hinglish queries with a *Hinglish*-script gold (not cross-script) | 27 |

Consequences that must carry into any conclusion:

* A Tanglish→Tamil slice of **n = 12** has a 95% Wilson interval of roughly
  ±0.24 around any observed proportion. A jump from 0/12 to 3/12 is **not**
  statistically distinguishable from 0/12 at conventional thresholds.
* "All cross-script" is n = 44, not 225. It is not a reliable basis for ranking
  three models.
* The 40 Tanglish and 38 Hinglish queries are **mostly not cross-script pairs**
  (28 and 27 respectively have same-script Latin golds). Reporting
  "Tanglish performance" as a single number conflates two different tasks.

## Fitness for model selection

**Not suitable as the sole basis for a final embedding-model decision.**

What it *can* support:

* A reproducible measurement of three models on a fixed corpus, with the caveat
  that the corpus measures the models' behaviour on **synthetic** text.
* The **directional** finding that script, not language, dominates retrieval for
  these models — the Tanglish→Tamil 0/12 result is a large, consistent effect
  across three independently-trained models and is unlikely to be noise.
* Detecting a *large* effect, e.g. 0/12 → 8/12, which a 12-item sample can
  support even though it cannot support a 0/12 → 3/12 change.

What it **cannot** support:

* Fine-grained model ranking. Differences of a few points in R@3/MRR@5 are
  inside the noise of a 225-query synthetic corpus, and the independent
  re-analysis already found most pairwise R@3 gaps not statistically
  distinguishable.
* Any claim about real-world Tamil or Tanglish retrieval quality.
* A confident claim about Tanglish *naturalness*, which is the input the whole
  cross-script conclusion depends on.

## Required before a decision

1. A Tamil-speaking reviewer completes `dataset_validation_sample.csv` using
   `HUMAN_VALIDATION_INSTRUCTIONS.md`.
2. Reviewer count is raised to **at least two**, so inter-annotator agreement
   (Cohen's κ) can be reported.
3. The 2 confirmed CJK artefacts are corrected and the corpus is re-scanned.
4. Sample size is raised for the cross-script slices — **12** is too small to
   drive a production choice on its own.
5. Ideally, the corpus is supplemented with real (consented) Tamil content,
   since synthetic text cannot stand in for it indefinitely.

## Recording rule

Any field not backed by evidence above is written `UNKNOWN` and is **not**
filled by the AI agent. No reviewer results have been synthesised.