# Statistical Comparison — Raw vs Normalized

Machine-readable source: `statistics.json` (72 paired comparisons).
All comparisons are **paired at the (query, gold-document) level** — the same
items appear in both arms — so each test is on differences.

## Method

| Element | Choice | Why |
|---|---|---|
| Bootstrap | paired, 10 000 resamples, seed `20261003` | item-level pairing preserved |
| CI | 95% percentile | reported as a difference CI |
| Metric CI | sign-flip permutation, 10 000 perms | distribution-free |
| Hit-rate CI | McNemar **exact** (binomial) | correct for paired binary data |
| Rank source | top-5 only; not-in-top-5 counts as 0 | matches the original benchmark's truncated ranks |

No correction for multiple comparisons is applied. With 72 comparisons, some
p-values below 0.05 are expected by chance; the effect sizes and CIs, not the
p-values alone, carry the interpretation.

## Verdict rule used

A difference is called **real** only if the 95% CI excludes zero **and** the
permutation p < 0.05. A raw score being higher is never sufficient.

---

## 1. Headline slices, Option A (`norm_q_to_script`, queries only)

### Tanglish → Tamil — R@5 (n = 12)

| Model | Raw | Normalized | Difference | 95% CI | Perm p | McNemar b/c | Exact p | Verdict |
|---|---:|---:|---:|---|---:|---:|---:|---|
| bge_m3 | 0.000 | 0.250 | +0.250 | [+0.000, +0.500] | 0.248 | 3/0 | 0.250 | **not real** |
| tamil_embed | 0.000 | 0.083 | +0.083 | [+0.000, +0.250] | 1.000 | 1/0 | 1.000 | **not real** |
| e5_base | 0.000 | 0.083 | +0.083 | [+0.000, +0.250] | 1.000 | 1/0 | 1.000 | **not real** |

The improvement is **in the right direction but not statistically
distinguishable from zero**. The CI's lower bound is exactly 0.000 and the
McNemar cell is 3/0 — only 3 of 12 queries moved from miss to hit with **zero**
regressions in this slice, which is why the test is weak. This is the textbook
n = 12 ceiling, exactly as flagged in `dataset_quality_status.md`.

### All cross-script — R@5 (n = 48)

| Model | Raw | Normalized | Difference | 95% CI | Perm p | Verdict |
|---|---:|---:|---:|---|---:|---|
| bge_m3 | 0.521 | 0.562 | +0.042 | [-0.083, +0.167] | 0.733 | **not real** |
| tamil_embed | 0.458 | 0.479 | +0.021 | [-0.062, +0.104] | 1.000 | **not real** |
| e5_base | 0.375 | 0.417 | +0.042 | [-0.042, +0.125] | 0.627 | **not real** |

All three CIs straddle zero. Cross-script retrieval does **not** improve
significantly for any model.

### Same-script control — R@5 (n = 208) — REGRESSION

| Model | Raw | Normalized | Difference | 95% CI | Perm p | McNemar b/c | Exact p | Verdict |
|---|---:|---:|---:|---|---:|---:|---:|---|
| bge_m3 | 0.788 | 0.702 | **-0.087** | [-0.130, -0.043] | 0.0002 | 2/20 | 0.0001 | **REAL REGRESSION** |
| tamil_embed | 0.760 | 0.611 | **-0.149** | [-0.202, -0.101] | 0.0001 | 1/32 | <0.0001 | **REAL REGRESSION** |
| e5_base | 0.760 | 0.630 | **-0.130** | [-0.183, -0.082] | 0.0001 | 1/28 | <0.0001 | **REAL REGRESSION** |

This is the decisive result. The McNemar columns are lopsided in exactly the
wrong direction: `tamil_embed` gained 1 pair and lost 32.

### Overall — R@5 (n = 256)

| Model | Raw | Normalized | Difference | 95% CI | Perm p | Exact p | Verdict |
|---|---:|---:|---:|---|---:|---:|---|
| bge_m3 | 0.738 | 0.676 | -0.062 | [-0.105, -0.023] | 0.005 | 0.005 | **REAL REGRESSION** |
| tamil_embed | 0.703 | 0.586 | -0.117 | [-0.164, -0.074] | 0.000 | <0.0001 | **REAL REGRESSION** |
| e5_base | 0.688 | 0.590 | -0.098 | [-0.141, -0.055] | 0.000 | <0.0001 | **REAL REGRESSION** |

### Hinglish → Devanagari — R@5 (n = 11)

| Model | Raw | Normalized | Difference | 95% CI | Perm p | Verdict |
|---|---:|---:|---:|---|---:|---|
| bge_m3 | 0.455 | 0.364 | -0.091 | [-0.455, +0.273] | 1.000 | not real |
| tamil_embed | 0.182 | 0.182 | +0.000 | [-0.364, +0.364] | 1.000 | no change |
| e5_base | 0.182 | 0.273 | +0.091 | [-0.182, +0.364] | 1.000 | not real |

Nothing distinguishable at n = 11.

---

## 2. Where the same-script regression comes from

Native-script → native-script retrieval is **completely untouched** (Option A
never rewrites an already-native query), which is the correct behaviour and a
useful internal control:

| Direction | n | bge_m3 | tamil_embed | e5_base |
|---|---:|---|---|---|
| English → English | 38 | 0.868 → 0.868 | 0.842 → 0.842 | 0.895 → 0.895 |
| Tamil → Tamil | 31 | 0.742 → 0.742 | 0.645 → 0.645 | 0.677 → 0.677 |
| Hindi → Hindi | 22 | 0.818 → 0.818 | 0.727 → 0.727 | 0.727 → 0.727 |
| Tamil → Tanglish doc | 21 | 0.714 → 0.714 | 0.619 → 0.619 | 0.571 → 0.571 |

The damage is entirely on **Latin-script queries retrieving Latin/English
documents** — the majority use case (79 of 113 documents are Latin script):

| Direction | n | bge_m3 | tamil_embed | e5_base |
|---|---:|---|---|---|
| **Hinglish → English** | 29 | 0.828 → **0.621** | 0.862 → **0.345** | 0.828 → **0.345** |
| **Tanglish → English** | 29 | 0.724 → **0.310** | 0.690 → **0.138** | 0.690 → **0.241** |
| **Tamil → English** | 50 | 0.720 → **0.480** | 0.660 → **0.340** | 0.640 → **0.380** |
| **Hindi → English** | 53 | 0.792 → **0.679** | 0.830 → **0.547** | 0.792 → **0.528** |

**Mechanism.** Tanglish and Hinglish queries are lexically *English*. Forcing
them into Tamil/Devanagari script destroys the lexical overlap with English
documents — `greeting` becomes `க்ரீதிங்க்`, which no longer shares subwords
with any English document. The transformation is applied to 78 of 225 queries
and costs a large fraction of those retrievals.

This is why the regression is large and reliable while the cross-script gain is
small and unreliable: the cross-script slice is 12 queries, the damaged slice is
over 100.

---

## 3. Option B (`norm_all_to_latin`, queries + documents) — diagnostic

Romanising everything to Latin fails comprehensively.

| Slice | n | Model | Raw | Normalized | Difference | 95% CI | Perm p |
|---|---:|---|---:|---:|---:|---|---:|
| all cross-script | 48 | bge_m3 | 0.521 | 0.146 | -0.375 | [-0.542, -0.188] | 0.0007 |
| all cross-script | 48 | tamil_embed | 0.458 | **0.000** | -0.458 | [-0.604, -0.312] | 0.0001 |
| all cross-script | 48 | e5_base | 0.375 | **0.000** | -0.375 | [-0.521, -0.250] | 0.0001 |
| same-script control | 208 | bge_m3 | 0.788 | 0.625 | -0.163 | [-0.226, -0.101] | 0.0001 |
| same-script control | 208 | tamil_embed | 0.760 | 0.543 | -0.216 | [-0.279, -0.154] | 0.0001 |
| same-script control | 208 | e5_base | 0.760 | 0.529 | -0.231 | [-0.293, -0.168] | 0.0001 |
| overall | 256 | bge_m3 | 0.738 | 0.535 | -0.203 | [-0.266, -0.141] | 0.0001 |
| overall | 256 | tamil_embed | 0.703 | 0.441 | -0.262 | [-0.320, -0.203] | 0.0001 |
| overall | 256 | e5_base | 0.688 | 0.430 | -0.258 | [-0.312, -0.203] | 0.0001 |

**Cross-script R@5 collapses to exactly 0.000 for two of three models.** It does
not even fix the 0/12 Tanglish → Tamil case. Additionally it destroys
same-script native retrieval (`Hindi → Hindi` falls to 0.318 for `e5_base`,
`Tamil → Tamil` to 0.387).

Why: `optitrans_dravidian` emits heavily diacritic-laden Latin —
`தமிழில்` → `dhami.Lil`, `உள்ளடக்கம்` → `uLLaDhaghghaM`, `குறைந்த` →
`ghu.Rhaindha`. These tokenisations are unlike anything in these models'
training distribution, so matching degrades even against other romanised Tamil.
Tanglish queries stayed Latin while Tamil documents became exotic Latin, so the
two no longer meet in the middle. The theory was reasonable; the specific
romanisation is the problem.

Option B is rejected on this evidence.

---

## 4. Cross-model comparisons (unchanged by this study)

This evaluation does not revisit the model ranking, and adds no evidence that
changes it. Consistent with the prior independent re-analysis:

* BGE-M3 retains a statistically established **R@1** advantage over Tamil-Embed.
* **R@3 is not statistically distinguishable** between any pair.
* The claim "BGE-M3 is ahead across the major retrieval metrics" is **not**
  supported and is not repeated here.
* "Tamil-Embed is not best on Tamil" is **not** supported. On Tamil query →
  Tamil document, BGE-M3 and E5-base both reach R@3 = 0.80 against Tamil-Embed's
  0.72 — so Tamil-Embed is not the strongest model on its own language.

No normalization condition changes any of this. Under Option A the model order
on the overall metric is unchanged (bge_m3 > e5_base ≈ tamil_embed); under
Option B all three degrade together.

---

## 5. Summary

| Question | Answer | Evidence |
|---|---|---|
| Did normalization materially improve cross-script retrieval? | **No** | all cross-script CIs include 0 (p = 0.63–1.00) |
| Did it fix Tanglish → Tamil? | **No** | 0/12 → 3/12 for bge_m3, CI [+0.000, +0.500], p = 0.248 |
| Did it fix Hinglish → Devanagari? | **No** | n = 11, nothing significant |
| Did same-script retrieval regress? | **Yes, significantly and materially** | -0.087 to -0.149, p ≤ 0.0002 |
| Did overall retrieval regress? | **Yes, significantly** | -0.062 to -0.117, p ≤ 0.005 |
| Is either option recommended? | **No** | Option A net negative; Option B catastrophic |

**Net effect of normalization on this corpus: clearly negative.** A small,
non-significant cross-script gain is swamped by a large, highly significant
regression on the dominant Latin-query → English-document paths.