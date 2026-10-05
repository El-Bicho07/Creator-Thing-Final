# Phase 2 Final Report — Shared AI Primitives

**Date:** 2026-10-03
**Scope:** LLM Gateway, unified E5-base embedding service, controlled 384 → 768 vector migration, Creator Voice Engine, Long-Term Memory Engine, Module 13/19 adaptation, integration, security validation, AI evaluation.

Labels used throughout: **IMPLEMENTED** (code exists) · **VERIFIED** (executed and evidenced) · **DEFERRED** (deliberately out of scope) · **PENDING** (blocked on something external) · **UNVERIFIED** (code exists but could not be exercised).

---

## 1. Executive summary

Phase 2 is implemented and verified. **212 tests pass, 1 skipped, 0 failures.**

The decisive architectural outcome is the boundary the task asked for:

> No feature module knows it is using E5-base. Only the `EmbeddingService` knows.

That is enforced statically by contract tests, not by convention.

Three things are worth surfacing to the reader before anything else.

1. **The vector migration was executed for real**, with expand/contract,
   fail-closed guards, and a proof that vectors were genuinely regenerated rather
   than padded (max deviation from freshly-computed E5 output: **1.3e-07**; a
   hypothetical padded vector would score only **0.701**).

2. **Two latent security defects from Phase 1 were found and fixed.** The RLS
   identity was set with `SET LOCAL`, which is *transaction*-scoped — so after
   any commit the creator's identity silently reverted to the zero UUID and RLS
   hid **all** of their rows. The obvious fix (session scope) would then have
   leaked one creator's identity to the next request on a pooled connection. The
   correct fix pins one connection per request and resets the claims before
   release. Both are documented in `docs/verification-log.md` §7.

3. **The Phase 1 security tests were already failing** before Phase 2 began
   (invalid SQL, misuse of `AsyncSession.fetchone`, an unprivileged setup fixture
   that RLS correctly rejected). They are repaired and now pass. This was
   required by the acceptance criterion "Phase 1 tests remain passing", so it was
   not optional.

**The selected embedding model is `intfloat/multilingual-e5-base` (768-d), as
instructed.** BGE-M3 and Tamil-Embed are implemented nowhere, configured
nowhere, and fallbacks to them do not exist.

---

## 2. LLM Gateway — IMPLEMENTED & VERIFIED

`apps/api/app/llm/gateway.py` is the single point of egress for all LLM calls.

| Contract capability | Status | Note |
|---|---|---|
| Provider routing / abstraction | IMPLEMENTED & VERIFIED | adapter registry |
| Model routing | IMPLEMENTED & VERIFIED | per-provider resolution |
| Timeout enforcement | IMPLEMENTED & VERIFIED | never infinite |
| Bounded retry + exponential backoff | IMPLEMENTED & VERIFIED | 3 attempts, 1/2/4 s |
| Provider fallback | IMPLEMENTED & VERIFIED | incl. schema-invalid responses |
| Structured output validation | IMPLEMENTED & VERIFIED | Pydantic v2 |
| One repair attempt, then FAILED | IMPLEMENTED & VERIFIED | never silently accepted |
| Error normalisation | IMPLEMENTED & VERIFIED | no SDK type escapes |
| Token / cost / latency tracking | IMPLEMENTED & VERIFIED | `ai_calls` rows confirmed |
| Prompt versioning | IMPLEMENTED & VERIFIED | `packages/prompts/` |
| Response caching | IMPLEMENTED & VERIFIED | TTL + LRU |
| Per-user token budget | DEFERRED | config key present |
| Per-feature rate limits | DEFERRED | config key present |

### Providers

| Provider | Status |
|---|---|
| `mock` (deterministic) | IMPLEMENTED & VERIFIED — the default |
| Gemini | **UNVERIFIED** — no credential (ADR-006) |
| Anthropic | **UNVERIFIED** — no credential |
| Groq | **UNVERIFIED** — no credential |

The live adapters are implemented behind the abstraction and tested only for
credential gating and clean failure. **They have never run against a live API.**
Because no provider credential exists, the platform runs on the deterministic
mock so that validation, repair, retry, fallback and accounting are all genuinely
exercised rather than stubbed. Switching to a live provider is configuration only.

### Notable correctness fix

Adapters are `async` by contract. The first draft called `asyncio.run()` inside
them, which is illegal inside a running event loop and would have failed on the
first real request.

---

## 3. E5-base EmbeddingService — IMPLEMENTED & VERIFIED

`apps/api/app/ai/embedding/` — the only module that knows the model exists.

| Property | Value | Verified |
|---|---|---|
| Model | `intfloat/multilingual-e5-base` | load-time assert |
| Revision | `d128750597153bb5987e10b1c3493a34e5a4502a` | pinned |
| Dimension | 768 | assert |
| Query prefix | `query: ` | assert + cosine test |
| Document prefix | `passage: ` | assert |
| Normalisation | L2 | unit norm to 1e-5 |
| Similarity | cosine | pgvector `vector_cosine_ops` |
| dtype / max_seq / batch | float32 / 512 / 16 | metadata |
| Tokenizer | `XLMRobertaTokenizerFast` | measured |

The prefixes are **mandatory and enforced**: configuration is rejected at
construction if they are stripped, and `EMBEDDING_NORMALIZE=false` refuses to
start because it would silently change ranking against un-normalised vectors.

### Measured library versions (not assumed)

Python 3.12.15 · sentence-transformers 3.4.0 · transformers 4.57.6 · torch
2.14.1 · tokenizers 0.22.2 · huggingface-hub 0.36.2 · **numpy 1.26.4** ·
safetensors 0.8.0 · pgvector 0.5.0 · fastapi 0.115.0 · pydantic 2.10.0 ·
sqlalchemy 2.0.36 · asyncpg 0.29.0 · Linux 6.8.0-138.

> Corrects an earlier error: a previous report listed numpy 2.5.3, copied in
> error from another module's requirements. The measured value is 1.26.4.

### Out of scope, as instructed — VERIFIED ABSENT

`bge-m3`, `tamil-embed-base`, and any transliteration pipeline appear **nowhere**
in `apps/api/app/`. Two contract tests enforce this, including instantiating the
service with each removed model and asserting refusal.

---

## 4. The 384 → 768 vector migration — IMPLEMENTED & VERIFIED

### Inventory of every 384-dimensional assumption

| Location | Kind | Disposition |
|---|---|---|
| `infra/db/migrations/002_core_schema.sql` | schema `vector(384) NOT NULL` | replaced by 003/004 |
| `apps/api/app/core/config.py` | `EMBEDDING_MODEL=all-MiniLM-L6-v2` | replaced with the full E5 config block |
| `infra/docker-compose.yml` | env default | replaced, prefixes quoted for YAML |
| `.env`, `.env.example` | `EMBEDDING_MODEL` | replaced |
| `apps/api/scripts/*`, `scripts/*` | historical benchmark scripts | **left as evidence** |
| `tests/security/*` | 3-dim vector literals in fixtures | updated to 768 |
| Donor `modules/` | hash vectorizer / fastembed BGE | **never adopted** |

### Strategy: expand → backfill → contract

```text
003 EXPAND    add embedding_v2 vector(768) + provenance columns;
              relax legacy NOT NULL; add schema_migrations
BACKFILL      python -m app.memory.reembed   (real E5 passage: output)
              python -m app.memory.reembed --verify
004 CONTRACT  guards abort unless complete; drop 384 column;
              promote 768 to `embedding`; SET NOT NULL; rebuild ivfflat
```

Two findings worth recording:

* **The legacy `NOT NULL` made the expand phase impossible.** New chunks could
  not be inserted until they had a 384-d vector, and none could legitimately be
  produced because the old model is out of scope. Padding was the only way
  forward — precisely the corruption this migration exists to prevent. The expand
  migration therefore relaxes it, and the contract migration restores `NOT NULL`
  on the 768-d column.
* **`docker-entrypoint-initdb.d` only runs on first init**, so migrations after
  the initial schema are applied explicitly via `infra/db/migrations/apply.sh`,
  which records state in `schema_migrations`.

### Evidence the data was genuinely re-embedded

| Check | Result |
|---|---|
| Legacy fixtures seeded | 8 chunks with **real** `all-MiniLM-L6-v2` 384-d vectors |
| Re-embedded | 8/8, 0 failed, 0 retries, 11.0 s |
| Stored vs freshly computed E5 | max abs deviation **1.3e-07**, cosine 0.99999993 |
| Hypothetical 384-pad | cosine **0.701** — clearly not what is stored |
| Idempotency | re-run: embedded 0, already_current 8 |
| Guard negative test | missing vector → aborted; wrong model → aborted |
| Final schema | `vector(768) NOT NULL`, one column, `embedding_v2` dropped |
| `vector(384)` columns anywhere | **0** |
| Current rows | 40 chunks, all 768-d, 1 distinct model, 0 NULL |

### Operational safety note

Re-embedding must span **all** creators, but `api_user` is RLS-scoped by design,
so it sees nothing. The re-embed CLI therefore requires `ADMIN_DATABASE_URL`
(a role that bypasses RLS) and **refuses to run** without it rather than silently
processing only the zero-UUID creator. That URL is operational tooling only; the
API never uses it.

---

## 5. Creator Voice Engine — IMPLEMENTED & VERIFIED

Adapted from Module 13. Uses `EmbeddingService` and `LLMGateway`; owns no vector
store, no LLM client, no auth path.

Preserved: deterministic feature extraction (rhythm, emoji, hashtags, pronouns,
CTA / educational / promotional / storytelling vocabulary, formatting habits),
profile aggregation, voice-match scoring, named profiles, retrieval, updates.

Canonical storage is `voice_profiles` under RLS. **A creator may keep several
named profiles** (e.g. `Primary Style`, `Tamil Explainer`) — uniqueness is on
`(user_id, style_name)`, added in migration 005. Restricting a creator to one
voice would be wrong for a multilingual platform.

Two quality defects found and fixed:

* `forbidden_words` was auto-derived from the creator's own most frequent words,
  producing violations such as *"contains flagged vocabulary: 'the'"*. It is now
  only ever explicitly supplied.
* The formality heuristic saturated: formal legal text and casual text both
  scored 0.800, so an off-voice draft could outscore the creator's own style
  (0.878 vs 0.829). Formality now uses word length, register vocabulary and
  contractions; the same comparison is now 0.873 (on-voice) vs 0.534 (formal).

**Calibration caveat:** the register heuristics are calibrated on three synthetic
samples. They are deterministic and inspectable, but they are not validated
against real creators.

---

## 6. Long-Term Memory Engine — IMPLEMENTED & VERIFIED

Adapted from Module 19. Implements `ingest`, `chunk`, `embed`, `store`,
`retrieve`, `summarize`, `update`, `delete`, over the existing
`content_assets` + `chunks` tables.

Design decisions worth stating:

* **Token-bounded chunking** using the embedding tokenizer, not characters. E5
  truncates at 512 tokens; character-based chunking silently loses tails and
  quietly corrupts retrieval quality.
* **The memory write policy** (`app/memory/policy.py`) is a single auditable
  decision point, not scattered logic. It rejects transient conversational filler
  and **always** redacts credential-shaped and personal values — an explicit
  "remember this" request relaxes the transience rule but never redaction.
* **`update_chunk` re-embeds.** Leaving the old vector after an edit would make
  the index inconsistent with the text; verified by test.
* Module 19's `fastembed` BGE space and `channel_id` isolation were both removed.

### Security — VERIFIED

Every operation is creator-scoped in SQL **and** by RLS. The decisive test is
that an *unfiltered* `SELECT count(*) FROM chunks` as user B returns **0** —
proving PostgreSQL, not the application, is the boundary. A foreign asset delete
returns 404, not 403, so the endpoint cannot be used to confirm another user's id.

### Prompt-injection posture

Retrieved memory is untrusted data. There is deliberately **no API** on the
gateway for placing retrieved text into the system channel; memory only ever
travels as user content, behind an explicit preamble. Feature code physically
cannot promote memory to an instruction.

---

## 7. Module 13 adaptation — IMPLEMENTED

| Capability | Disposition |
|---|---|
| Feature extraction | ADAPT → `app/voice/engine.py` |
| Profile aggregation | ADAPT → `app/voice/engine.py` |
| Voice-match validation | ADAPT → `app/voice/engine.py` |
| "Embedding service" | **REBUILD** — was a bag-of-words hash using per-process-salted `hash()`, i.e. not reproducible across restarts |
| Direct `google-genai` calls | **REBUILD** → `LLMGateway` |
| Image/vision analysis | PARK — out of scope |
| Donor tables, alembic, routes, frontend | PARK |

## 8. Module 19 adaptation — IMPLEMENTED

| Capability | Disposition |
|---|---|
| Ingest pipeline | ADAPT → `app/memory/retrieval.py` |
| pgvector cosine search | ADAPT — `channel_id` → RLS `user_id`, provenance added |
| `fastembed` BGE embeddings | **REBUILD** → E5-base (incompatible vector space) |
| Transcript chunking | ADAPT → `app/memory/chunking.py` |
| Direct `groq`/`gemini` calls | **REBUILD** → `LLMGateway` |
| Multi-agent supervisor, knowledge graph, YouTube | PARK — Phase 3 / Phase 5 |

Full detail with rationale: `docs/porting-log.md`.

---

## 9. Security / RLS verification — VERIFIED

| Scenario | Result |
|---|---|
| A reads own memory | PASS |
| B reads A's memory (incl. unfiltered SQL) | 0 rows |
| B updates A's chunk | 0 rows |
| B inserts a chunk owned by A | rejected by `WITH CHECK` |
| B deletes A's asset / voice profile | 404 |
| B vector + batch retrieval | 0 results |
| No JWT context | zero UUID, 0 rows (fail-safe, not fail-open) |
| Cross-user over HTTP | 0 results; no `user_id` in any OpenAPI schema |
| Secrets in stored chunk text | absent; redacted pre-storage |
| `.env` tracked by git | no |
| Real credentials in code | none (only synthetic `sk-abcdef…` fixtures) |

Two design points worth naming:

* **One connection per request.** The identity must be pinned to a physical
  connection for the request's lifetime, or a commit returns the connection to the
  pool and the next statement may run without it.
* **Claims are reset before release**, so the next request on that pooled
  connection cannot inherit the previous creator's identity.

`api_user` remains a non-superuser, so an application bug cannot bypass RLS.

---

## 10. Test results — VERIFIED

```text
212 passed, 1 skipped, 0 failed
```

The skip is a conditional guard that requires a User-B-visible asset; it skips
rather than asserting vacuously.

Coverage includes unit tests (gateway 39, embedding 28, memory 27, voice 26,
evaluation 13), RLS isolation (13), API contract (25), architectural contract (9),
end-to-end (4) and the repaired Phase 1 security tests (29).

The end-to-end test proves the full chain — authenticated creator → Voice
Engine → profile → memory ingestion → E5-base → 768-d pgvector → retrieval →
LLM Gateway → `ai_calls` — and asserts that a second creator observes none of it.

---

## 11. AI evaluation framework — IMPLEMENTED & VERIFIED

Extensible framework plus **25 golden scenarios** covering all six required
categories: memory retrieval, voice matching, relevance, faithfulness,
usefulness, creator-context preservation.

```text
scenarios : 25      passed : 24      pass rate : 0.96

voice_matching               0.8573
faithfulness                 0.6895
creator_context_preservation 0.6546
usefulness                   0.5994
relevance                    0.5662
memory_retrieval             0.5647
```

Faithfulness and usefulness are scored by deterministic, inspectable rules rather
than a judge model. That keeps the framework runnable with no credential while
staying honest about what it measures.

**The one failure is real and is kept, not hidden.**
`mem_007_distractor_discrimination` pits two near-identical documents stating
opposite conclusions; embedding similarity cannot reliably separate them. It is
retained with an `expectation_note`, because deleting it would misrepresent the
platform.

The cross-script limitation is likewise encoded as an explicit scenario
(`mem_013_tanglish_known_limitation`) asserting *current* behaviour, so the
constraint stays visible in CI.

Report: `docs/eval/phase2_ai_evaluation.json`.

---

## 12. Documentation changes

| Document | Change |
|---|---|
| `docs/decisions/002-embedding-model.md` | §13 records the accepted decision, why bge-m3 and tamil-embed were not selected, benchmark limitations, that transliteration is **not** adopted, and measured library versions |
| `docs/decisions/003-llm-gateway-contract.md` | status → IMPLEMENTED, per-capability table, deliberate deviations |
| `docs/architecture.md` | embedding model/dimension/prefixes corrected; vector column 768; Voice/Memory sections now describe what exists |
| `docs/porting-log.md` | Phase 2 classification for every donor file |
| `docs/verification-log.md` | Phase 2 evidence and the 12 defects found |
| `docs/INTEGRATION_STATUS.md` | capability matrix |
| `docs/PHASE_2_READINESS.md` | gates cleared, criteria, residual risks |
| `docs/PHASE_2_FINAL_REPORT.md` | this document |

Historical benchmark results are **not deleted**. The two Phase 1 evaluation
outputs and their reports remain in `docs/eval/`.

Two claims are explicitly **not** repeated: that "BGE-M3 is ahead across the major
retrieval metrics", and that "Tamil-Embed is not best on Tamil" — the latter is
true, but its own Tamil specialisation did not deliver (R@3 0.72 vs 0.80).

---

## 13. Known limitations

1. **No live LLM provider.** All AI behaviour is validated against a
   deterministic mock. Real-model quality, latency and cost are unmeasured.
2. **Live provider adapters are UNVERIFIED.** They have never contacted an API.
3. **The embedding benchmark corpus was never human-validated** — 0/30 pairs. The
   model decision rests on a synthetic single-agent corpus with 2 confirmed CJK
   contaminations. This must not be presented as production-grade evidence.
4. **Cross-script retrieval is a known platform limitation.** Tanglish → Tamil was
   0/12 for every candidate model, and Phase 1 showed transliteration makes it
   materially worse (same-script regression up to −0.149, p ≤ 0.0002). This is a
   product constraint, not a bug.
5. **Voice register detection is heuristic** and calibrated on synthetic samples.
6. **Frontend is not compiler-verified.** `apps/web` lacks the TypeScript
   toolchain in this environment, so `lib/api.ts` and `app/phase2/page.tsx` are
   unverified by `tsc`.
7. **Job execution is in-process**; there is no separate worker.
8. **ivfflat `lists = 100` is approximate** and inherited from Phase 1. On a small
   corpus it can return fewer than `k` neighbours unless `ivfflat.probes` is
   raised — relevant to early-stage recall.
9. **Memory summarisation does not call an LLM** by design, so it works with no
   credential. LLM condensation would go through the gateway.
10. **Evaluation uses no judge model**, so faithfulness/usefulness are rule-based
    proxies, not human or model judgements.

---

## 14. Deferred work

| Item | Status | Why |
|---|---|---|
| Per-user token budget enforcement | DEFERRED | config + schema ready; additive |
| Per-feature rate limiting | DEFERRED | config key ready |
| Distributed job worker | DEFERRED | lifecycle real; broker unnecessary so far |
| Vision / image analysis | PARKED | needs vision provider + storage |
| YouTube ingestion | PARKED | needs `YOUTUBE_API_KEY` (ADR-006 defers to Phase 5) |
| Knowledge-graph stance linking | PARKED | beyond Phase 2 RAG scope |
| Studio / Library full UX | PHASE 3 | §33 limits Phase 2 to a verification surface |
| Script-aware retrieval/expansion | DEFERRED | recommended direction per Phase 1 evidence |

---

## 15. Phase 3 readiness

**READY.** The shared primitives exist, are verified, and are correctly bounded.

* Exactly **one** LLM egress point (ADR-003).
* Exactly **one** embedding abstraction; no feature module knows the model
  (ADR-002 §13, contract-tested).
* Exactly **one** vector store: `chunks.embedding vector(768)`.
* RLS verified as the authoritative boundary, with the two latent identity
  defects fixed.
* No donor auth, database, vector store, embedding service, LLM abstraction or
  navigation survived; `modules/` is byte-for-byte unchanged.

Phase 3 (STUDIO) can be built without touching E5 internals or the migration
path. The honest caveats to carry forward: the LLM layer is unproven against a
real model, and the embedding evidence base is a synthetic, non-human-validated
corpus.

```text
EMBEDDING MODEL: intfloat/multilingual-e5-base (768-d) — ACCEPTED (ADR-002 §13)
PHASE 2: COMPLETE — IMPLEMENTED AND VERIFIED
PHASE 3: READY (not started)
```
