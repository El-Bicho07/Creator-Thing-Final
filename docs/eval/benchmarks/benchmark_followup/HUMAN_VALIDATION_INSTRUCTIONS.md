# Human Validation Instructions — Tamil / Tanglish Benchmark Data

## Purpose

The benchmark corpus (113 documents, 225 queries) was written by a single AI
agent. It has **never been reviewed by a Tamil-speaking human**. This document
describes how to review a 30-pair sample so that the dataset's fitness for model
selection can be assessed.

> **No reviewer results are included in this repository.**
> `human_validation_results.csv` is deliberately **absent**.
> It must only be created after a real human reviewer submits judgements.
> See `dataset_quality_status.md` for the current (unvalidated) status.

## Who should review

A native or near-native **Tamil** speaker who also reads **Tanglish**
(Tamil written in Latin script, sometimes called "Tamil-English" or
"Bāṉjōlā"). A reviewer who does not read Tanglish cannot judge the
`tanglish_naturalness` field and should say so rather than guess.

## What to review

`dataset_validation_sample.csv` — 30 `(query → gold document)` pairs:

| Group | Rows | Definition |
|---|---:|---|
| Tamil-related | 15 | `query_language = ta`, `query_type = native` |
| Tanglish-related | 15 | `query_type = Tanglish` |

Sampling seed is recorded in `validation_seed.txt` (`seed=20261003`), so the
sample is reproducible and not cherry-picked.

## How to review

For each row, judge four things independently. Do not let one judgement
influence another — in particular, judge **query naturalness** before you look at
whether the document is relevant.

### 1. `query_naturalness` — does the query read like real Tamil?

```
natural        Reads exactly like something a real Tamil speaker would type.
mostly_natural Understandable and broadly plausible, but some word choice,
               grammar or idiom feels off to a native speaker.
unnatural      Words are individually Tamil but the phrase is not something a
               Tamil speaker would actually write.
garbled        Malformed, mistranslated, or corrupted beyond interpretation.
```

### 2. `query_document_relevance` — does the gold document answer the query?

```
relevant           The document directly addresses what was asked.
partially_relevant Related topic, but does not actually answer the question.
irrelevant         The document is on an unrelated topic.
```

> Note: a document can be relevant while the query is unnatural. Record both.
> Also note that some queries list **two** gold documents; the sample contains
> the lower-sorting one only. If you think the *other* gold document is the
> better answer, note that in `notes`.

### 3. `tanglish_naturalness` — is the Tanglish idiomatic?

Judge the **query** (and, if it is itself Tanglish, the document).

```
natural          Real Tanglish as typed by a Tamil speaker in Latin script.
mostly_natural   Understandable; spelling or idiom slightly off.
unnatural        Looks machine-transliterated or made up.
garbled          Not valid Tanglish at all.
not_applicable   Neither side is Tanglish (use for pure native Tamil pairs).
```

### 4. `notes` — free text

Anything a reader would want flagged: mixed language inside a token, apparent
copy-paste of another item, content that looks generated rather than written,
or a better alternative gold document.

## Output format

Write `human_validation_results.csv` in the same folder with exactly these
columns:

```csv
query_id,gold_doc_id,query_naturalness,query_document_relevance,tanglish_naturalness,notes,reviewer_id,reviewed_at
```

* `reviewer_id` — a non-identifying label (e.g. `reviewer_1`), not a real name or email.
* `reviewed_at` — ISO-8601 date.
* `notes` — plain text; leave empty if there is nothing to add.
* Use only the exact vocabulary above. Do not invent new values.

## What the answers decide

| Finding | Consequence |
|---|---|
| Mostly `natural` / `relevant` | Corpus is credible for model selection. |
| Widespread `unnatural` / `garbled` | Retrieval numbers are uninterpretable — the models are being scored on text no human would write. |
| Widespread `partially_relevant` / `irrelevant` | Gold labels are wrong, so R@k and MRR are measuring the wrong thing. |
| `not_applicable` misused | Reviewer does not read Tanglish; get a second reviewer. |

## Known issue to check specifically

A scripted scan found **CJK characters inside two Tanglish/code-mixed items**,
which is a generator artefact rather than real Tanglish:

* `d_tan_idea_001` — contains `针对性的` (Chinese, "targeted")
* `q_x_tan_en_008` — contains `不及` (Chinese, "not as good as")

Please rate these explicitly and say whether you spot others. This is a useful
calibration of how much unflagged contamination the scripted scan can catch.

## Sample size caveat

30 pairs cannot establish corpus-wide quality. It is a **spot check**: it can
reveal that the corpus is bad, but cannot certify that it is good. A definitive
judgement needs a substantially larger stratified sample, plus **at least two
independent reviewers** so inter-annotator agreement can be computed. No
agreement statistic exists for this dataset today.