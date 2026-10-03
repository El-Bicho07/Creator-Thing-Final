# Normalization / Transliteration Methodology

## 1. NORMALIZATION TOOL

| Item | Value |
|---|---|
| Tool | `indic-transliteration` (IndicTrans / Sanscript lineage) |
| Version | `2.3.75` (pinned) |
| Language | pure Python (`py3-none-any`), 159 KB wheel |
| Dependencies | `regex`, `typer`, `toml`, `roman`, `backports.functools-lru-cache` |
| Installation | **isolated venv** at `/tmp/followup_norm_venv`, on the host |
| NOT installed into | the `creator-api` container / production image |

The tool is a **NORMALIZATION TOOL only**. It is not an embedding model and was
not used to produce any embedding. The three embedding models remain
`BAAI/bge-m3`, `Tamil-ai/tamil-embed-base`, `intfloat/multilingual-e5-base`.

### Why this library and not a hand-rolled transliterator

Part C requires checking what is already available. Findings:

* No Indic transliteration library was installed on the host **or** in the
  container. `importlib.util.find_spec` initially appeared to report several as
  present; that was a false positive, and `importlib.import_module` was used as
  the authoritative test. All of `indic_transliteration`,
  `indic_transliteration2`, `transliterate`, `aksharamukha`, `ai4bharat`,
  `indicnlp`, `sanscript`, `unidecode`, `indic_behava`, `bnl` fail to import in
  both environments.
* No transliteration utility is vendored anywhere in this repository. The only
  `translit` matches in `scripts/` are the literal word inside benchmark
  document text.
* PyPI **was** reachable, so the correct library was obtainable. It is small,
  pure-Python and pulls no ML framework, so it does not meet the bar of "a
  large new dependency".

Installing the canonical maintained library is therefore preferred over writing
a bespoke transliterator, which Part C explicitly warns against.

## 2. Scheme selection (empirical, not arbitrary)

Two schemes were candidates per language. Selection used **round-trip fidelity
measured on this corpus's own native-script text** (native → roman → native).

A trap was found and excluded: using the script name itself as the "roman"
scheme (`tamil` → `tamil`) is an identity operation and trivially scores 100%.
That degenerate case was discarded.

**Tamil** (43 native-script queries, 62 native items):

| scheme | exact | char |
|---|---:|---:|
| `iso` | 100.0% | 100.00% |
| `hk` | 100.0% | 100.00% |
| `optitrans_dravidian` | 100.0% | 100.00% |
| `kolkata_v2` | 100.0% | 100.00% |
| `optitrans` | 39.5% | 65.51% |
| `itrans` | 34.9% | 62.37% |
| `velthuis` | 9.3% | 52.97% |
| `iast` | 27.9% | 48.06% |

**Devanagari** (38 native-script queries, 53 native items):

| scheme | exact | char |
|---|---:|---:|
| `wx` | 47.4% | 92.27% |
| `iso` | 60.5% | 78.16% |
| `iast` | 60.5% | 78.16% |
| `hk` | 60.5% | 78.16% |
| `titus` | 60.5% | 78.16% |
| `itrans` | 57.9% | 78.04% |
| `optitrans` | 55.3% | 77.99% |

**Chosen:** `optitrans_dravidian` for Tamil (a Dravidian-specific scheme, tied
best on round trip, and best of all candidates on the colloquial probe below),
`iast` for Devanagari (standard scholarly scheme, best exact-match tie, and
clean behaviour on Hinglish input).

> **Round-trip fidelity is necessary but NOT sufficient.** It measures
> reversible mapping of *correct native* text. The actual production input is
> colloquial Tanglish, which is a different problem — see §3.

## 3. Measured limitation: colloquial Tanglish transliterates badly

A direct probe of Latin/Tanglish → Tamil:

| Tanglish input | output | assessment |
|---|---|---|
| `opening la greeting venuma illa` | `ஒபெநிங்க் ல க்ரீதிங்க் வேநும இல்ல` | **wrong** — English loanwords mangled |
| `moodhalnaal` | `மோஓதல்நால்` | **wrong** — double-`o` artefact |
| `srithiyaagaram` | `ஸ்ரிதியாகரம்` | **wrong** — aspirated `த்` lost |
| `vanakkam` | `வநக்கம்` | **wrong** — retroflex `ண` → `ன` |
| `theriyadhu` | `தேரியது` | wrong (negation `-து`/`ஆது` lost) |

Hinglish → Devanagari is noticeably better:

| Hinglish input | output |
|---|---|
| `bahut accha hai` | `बहुत् अच्च है` |
| `namaste` | `नमस्ते` |
| `maine video banaya` | `मैने विदेओ बनय` (vowel sign wrong) |

**Root cause.** Formal romanization schemes (IAST, ISO, OPTITRANS) assume
*standardised* roman spelling. Tanglish is informal and English-heavy: it uses
`k` for aspirates, `nk` for retroflex `ண`, doubled vowels, and embeds raw
English words (`opening`, `greeting`, `video`). No IndicTrans scheme encodes
these conventions, so loanwords are transliterated character-by-character into
nonsense Tamil.

The consequence is severe: the normalized query is lexically wrong but
*orthographically closer* to Tamil-script documents. See §7.

## 4. Pipeline — exact transformation

```
condition "raw"                 : query -> embed -> retrieve
condition "norm_q_to_script"    : query -> (script detect + lang route)
                                            -> transliterate Latin->native script
                                            -> embed -> retrieve
condition "norm_all_to_latin"   : query AND document -> romanise native script -> Latin
                                            -> embed -> retrieve
```

Implementation: `scripts/benchmark_followup/normalize.py`
(stage 1, host venv) then `scripts/benchmark_followup/run_retrieval.py`
(stage 2, in-container embedding).

### Script detection
Majority-non-ASCII detection over the Unicode blocks Tamil (U+0B80–0B0FF) and
Devanagari (U+0900–0x097F). Latin/digits/punctuation are ignored. Detector
agreed with the dataset's script label on **all 338 items — 0 disagreements**.

### Query / document treatment (Part F options)

Both documented options were implemented and run; neither was chosen a priori.

| Option | Treatment | Production-feasible? |
|---|---|---|
| **A** `norm_q_to_script` | queries only; stored documents untouched | **Yes** — no stored memory is re-embedded |
| **B** `norm_all_to_latin` | queries **and** documents | No — requires re-embedding every stored memory |
| C store both | keep raw + normalized vector | No — doubles the write path and index size |

**Option A is the headline condition** because it is the only one that fits the
Creator Platform memory architecture without a production migration: memories are
embedded once at write time and would still be stored in their original script.
Option B is reported as a diagnostic of whether document-side normalization
would help at all. Option C is not evaluated — it is strictly more expensive
than A with no additional retrieval benefit in this architecture.

**`norm_all_to_latin` results are reported for completeness only.**

### Oracle language identifier (important)
Option A must decide *which* native script to target, which requires knowing the
query's language. This implementation uses the dataset's recorded
`query_language` field. That is **oracle information not available at query time.**

In production this would have to be replaced by a language identifier, and its
errors would be **fatal rather than graceful**: misrouting an English query into
Tamil transliteration produces nonsense. This is a genuine deployment risk and is
not measured here. Option B needs no language identifier at all, which is its one
architectural advantage — it loses on accuracy for other reasons (§7).

## 5. What was held constant

To isolate normalization, only the *text* differs between conditions:

| Held fixed | Value |
|---|---|
| Models and revisions | pinned (see §6) |
| Query/passage prefixes | bge-m3 raw; `query:`/`passage:` for tamil-embed & e5-base |
| `max_length` | 512 |
| `batch_size` | 16 |
| `normalize_embeddings` | True |
| Similarity | cosine (dot product of L2-normalised vectors) |
| Tie-breaking | `numpy.argsort(kind="stable")` |
| Device | CPU |

## 6. Embedding models (not the normalization tool)

| key | repo | revision |
|---|---|---|
| `bge_m3` | `BAAI/bge-m3` | `5617a9f61b028005a4858fdac845db406aefb181` |
| `tamil_embed` | `Tamil-ai/tamil-embed-base` | `a5b5aa23a0a7eee1e7eccee53c5835c6e68b06ce` |
| `e5_base` | `intfloat/multilingual-e5-base` | `d128750597153bb5987e10b1c3493a34e5a4502a` |

No additional model was introduced. `trust_remote_code=True` only for
`tamil-embed`.

## 7. HARD GATE — the raw condition reproduces the original benchmark

The `raw` condition was re-run from scratch and compared against the saved
original benchmark, per model, across all 225 queries.

```
bge_m3        ok=True   mismatches=0
tamil_embed   ok=True   mismatches=0
e5_base       ok=True   mismatches=0
```

It also reproduces the published headline figures exactly:

| model | R@3 (this run) | R@3 (original) | MRR@5 (this run) | MRR@5 (original) |
|---|---:|---:|---:|---:|
| bge_m3 | 0.711 | 0.711 | 0.651 | 0.651 |
| tamil_embed | 0.689 | 0.689 | 0.588 | 0.588 |
| e5_base | 0.671 | 0.671 | 0.607 | 0.607 |

Because the baseline reproduces exactly, every raw-vs-normalized difference is
attributable to the text transformation alone. Had the gate failed, no
normalized number would have been reportable.

## 8. Coverage

| Item | Count |
|---|---:|
| documents | 113 |
| queries | 225 |
| queries transliterated under Option A | 78 |
| queries left unchanged under Option A | 147 |
| transliteration errors (exceptions) | 0 |
| documents romanised under Option B | 34 |
| queries romanised under Option B | 84 |
| script-label disagreements | 0 |

## 9. Optional 10-document sanity test — NOT RUN

Part I is conditional: *"If the normalization tooling is reliable, run the
proposed sanity test."* The precondition **fails**. §3 shows the tool produces
lexically wrong pseudo-Tamil for colloquial Tanglish, so a sanity test built on
it would measure the transliterator's errors rather than the hypothesis.

`benchmark_followup/tanglish_10_sanity.csv` is therefore **deliberately absent**.
No placeholder was created.

An equivalent probe already exists from the previous evaluation:
`2026-10-03_embedding_raw/extra_experiment_tanglish_probes.csv` — 10
freshly-authored Tanglish probes against 10 Tamil-script source documents,
**0/10 retrieved in top-5 for all three models**. That result stands and does not
need repeating.

## 10. Reproducibility

`scripts/benchmark_followup/analyze_followup.py` regenerates every metric CSV
from `raw_retrieval.json` + `normalized_inputs.json` using only the Python
standard library. See `reproducibility.md`.