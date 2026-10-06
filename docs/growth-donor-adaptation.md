# Phase 5 Donor Adaptation — Modules 10, 11, 19

**Phase:** 5 — Growth + Analytics Copilot
**Date:** 2026-10-06
**Principle:** the donor repository is a **capability source**, not an architectural
authority. Donor logic is reimplemented against platform contracts; donor
infrastructure is never imported or copied.

`modules/` is read-only and remained unmodified (1,065 tracked files, 0 diff lines).

---

## 1. Classification summary

| Module | Capability | Classification |
|---|---|---|
| **10 — Comment Analyzer** | Comment taxonomy (Theme/Question/Complaint/Opportunity) | **ADAPT** |
| | Sentiment + `actionable` flag | **ADAPT** |
| | Derived-signal aggregation (actionable questions, priority complaints, content leads) | **ADAPT** |
| | Gemini SDK call, own retry loop, mock fallback | **REJECT** |
| | Instagram Graph API fetcher | **PARK** |
| | SQLite schema | **PARK** |
| **11 — Comment-to-Content** | Intent taxonomy (8 intents, weighted) | **ADAPT** |
| | Demand scoring shape (unique commenters, intent weight, recency decay) | **ADAPT** |
| | Structured content-opportunity contract | **ADAPT** |
| | Generated hooks / captions / hashtags / reel blueprints | **PARK** — duplicates Studio |
| | `sentence-transformers` + `sklearn.KMeans` clustering | **REJECT** — second embedding system |
| | Direct Anthropic SDK service | **REJECT** — duplicates LLM Gateway |
| | Instagram connector, calendar, replies, cache | **PARK** |
| **19 — Creator Second Brain** | Grounded-citation answer pattern with a coverage verdict | **ADAPT** |
| | BGE embeddings via `fastembed` | **REJECT** — different embedding model |
| | Own pgvector search + similarity graph | **REJECT** — second vector store |
| | YouTube ingest, Whisper transcripts | **PARK** |
| | Reel scoring, Ghost Clip Composer, EDL export | **PARK** |
| | Agents/supervisor/specialists framework | **PARK** |
| **Analytics Copilot** | — | **NEW** (no donor equivalent) |

---

## 2. Module 10 — Comment Analyzer

**Size:** 18 files, 0 Python, JavaScript/Node.

### Capability

Classify a creator's audience comments into a small taxonomy, attach sentiment and
an actionable flag, then aggregate derived signals per post.

### Useful domain logic — ADAPTED

| Donor element | Why it is worth keeping |
|---|---|
| Four-category taxonomy: **Theme / Question / Complaint / Opportunity** | A small, genuinely useful vocabulary for audience signal. Mapped onto platform-native enums rather than free-text strings |
| `actionable` boolean | Separates "someone said something" from "a creator could act on this". This is the hinge of comment-to-content |
| Sentiment | Useful as an input signal, not as an output claim |
| Derived aggregation: `actionableQuestions`, `priorityComplaints`, `contentLeads` | Deterministic counts over classifications. Reimplemented as platform analytics, not dashboard queries |

### Unsafe architecture — REJECTED

| Element | Problem |
|---|---|
| `new GoogleGenAI({ apiKey })` | Direct provider SDK from a feature module. Violates the LLM Gateway boundary |
| Own retry loop with `sleep(delay); delay *= 2` | Duplicates Gateway retry, cost accounting, and observability |
| ``Comment: "${commentText}"`` | **Prompt-injection hole.** A comment containing a double quote breaks out of the quoting, and injected text is read as instruction. Phase 5 routes all comment text through `app.studio.safety` instead |
| Hardcoded `gemini-2.5-flash` | Model selection outside the Gateway |
| Silent `mockClassify` fallback | On failure the donor returns plausible-looking keyword classifications with no signal that anything failed. Phase 5 fails visibly or records an explicit degraded status — a fabricated classification is worse than none |
| Batch of 25 comments in one prompt | Unbounded context; one injection poisons 25 comments |
| SQLite `posts` / `comments` | Second datastore |
| `linkFetcher.js` Instagram Graph API | Automated external platform integration and distribution. Out of Phase 5 scope |
| Vanilla-JS dashboard | No value over a platform-native API |

### Missing pieces

No persistence of derived insights, no dedupe, no evidence linkage, no path from a
comment to a plan item, no RLS, no tenancy.

---

## 3. Module 11 — Comment-to-Content

**Size:** 74 files, 31 Python files, ~3,363 Python lines.

### Useful domain logic — ADAPTED

**Intent taxonomy with weights** (from `pipeline/intent.py`, `pipeline/score.py`):

| Intent | Donor weight |
|---|---|
| `request` | 2.6 |
| `pain_point` | 2.3 |
| `question` | 2.1 |
| `confusion` | 1.8 |
| `more_of_this` | 1.5 |
| `criticism` | 1.0 |
| `praise` | 0.5 |
| `other` | 0.3 |

The **ordering principle** is the valuable part: an audience explicitly asking for
follow-up content outranks general praise. Phase 5 keeps that ordering and
re-derives the numbers for the signals the platform actually has.

**Demand scoring shape** (from `pipeline/score.py`):

```
raw = unique_commenters ** 0.85 * (weighted_comment_sum + 1.0)
normalized = 45 + (raw - min) / (max - min) * 54      # 0-100 band, never 0
```

Two good ideas are kept: **unique commenters rather than raw comment count**, and
**a normalized 0–100 band that never bottoms out at zero**.

Two donor signals are **dropped because the platform does not have them**:
`comment likes` and `reply_count`, and the friend-@-mention shareability multiplier.
The donor `comments` table carries `likes`, `reply_count`, and mention detection;
the platform's `comments` table carries none of these. Per the Phase 5 rule against
fabricating metrics the platform lacks, these signals are excluded rather than
substituted with invented values. The scoring function therefore uses only signals
that exist: unique commenters (`author_hash`), intent weight, and recency decay.

**Structured opportunity contract** — the idea that an opportunity carries a topic,
a target format, and an angle. Adopted, and mapped onto the existing `ideas` table.

### Unsafe architecture — REJECTED

| Element | Problem |
|---|---|
| `SentenceTransformer(settings.EMBEDDING_MODEL_NAME)` in `pipeline/cluster.py` | A **second embedding system**. The platform's single authority is `EmbeddingService` / E5-base 768-D. Phase 5 must never import an embedding library from Growth |
| `sklearn.KMeans` clustering | A second vector store and an unsupervised model dependency. Phase 5 groups by deterministic keys and existing Memory retrieval |
| `import anthropic` in `services/llm.py` | Direct provider SDK plus its own structured-output/retry machinery. Duplicates LLM Gateway |
| Own response cache (`services/cache.py`) | Duplicates the Gateway's caching |
| Instagram connector, calendar scheduler, replies | External platform integration and distribution. Phase 5 explicitly excludes automated publishing |

### `pipeline/ideas.py` — 359 lines, PARKED as a boundary violation

This is the most important rejection in Phase 5. The donor generates complete
finished content: reel hooks, on-screen text, caption drafts, 5–8 hashtags, story
mention captions, and carousel slide blueprints — including 150+ lines of
hardcoded example output.

That is **exactly Studio's job**. Phase 3 owns generation, critique, and
refinement; Phase 5 owns understanding. Reimplementing this would create the second
generation engine the phase boundaries forbid.

What Phase 5 keeps is the *upstream* half: comment → intent → clustered topic →
structured opportunity (topic, target format, angle, demand score, evidence). The
opportunity then goes to Today/Producer, and **Studio** does the creating.

---

## 4. Module 19 — Creator Second Brain

**Size:** 82 files, 39 Python files, ~3,194 Python lines.

### Useful domain logic — ADAPTED

**The grounded-answer pattern** (`backend/ai/ask.py`): answer a question with
`[n]` inline citations that point at the exact source record, plus a verdict of
`covered` / `partially` / `new`.

This is the right shape for the Analytics Copilot's evidence requirement, and it is
adopted as a *pattern*: every Copilot answer references real source record ids, and
the deterministic analysis states its own coverage. The Phase 5 implementation
strengthens it — a citation must resolve to a record the creator actually owns, and
a missing metric is reported as unavailable rather than glossed.

### Unsafe architecture — REJECTED

| Element | Problem |
|---|---|
| `fastembed.TextEmbedding(settings.embedding_model)` — BGE | **A different embedding model.** The embedding decision is closed: `intfloat/multilingual-e5-base`, 768-D, `query:`/`passage:` prefixes. Not reopened |
| `search/vector.py`, `search/graph.py` | A second vector store and a similarity graph. Phase 5 uses the existing Memory Engine and `performance_records` |
| `ai/llm.py` (Groq + Whisper), `agents/llm.py` | Multiple LLM clients plus a 980-line agents framework (supervisor + 5 specialists). Enormous surface, all duplicating Phase 2 |
| YouTube Data API + Whisper transcript ingest | Distribution and media ingestion. Out of scope |
| Reel scoring, Ghost Clip Composer, EDL/shot-list export | Video production tooling; duplicates Studio |
| Promise Ledger | Interesting, but depends on transcript + on-camera commitment extraction. No transcripts exist in the platform. Deferred |

### Second Brain storage — explicitly NOT created

Phase 5 creates **no** second-brain store. Module 19's central value — a durable
semantic index of everything a creator has ever said — is **already implemented**
by the Phase 2 Long-Term Memory Engine. Growth consumes it through
`retrieve_for_prompt()` and `ingest()`, and never touches `chunks`, vectors, or the
embedding model.

---

## 5. Net result

| Measure | Result |
|---|---|
| Lines of donor implementation ported | **0** |
| Donor capabilities reimplemented against platform contracts | 3 taxonomies, 1 scoring shape, 1 answer pattern |
| New infrastructure introduced | **none** |
| Second embedding system | **none** |
| Second vector store | **none** |
| Second LLM client | **none** |
| Duplicate content-generation engine | **none** |
| `modules/` modified | **0 lines** |

Every Phase 5 AI call goes through the Phase 2 LLM Gateway, every prompt lives
under `packages/prompts/`, every semantic operation goes through the Phase 2
Embedding Service, every retrieval goes through the Phase 2 Memory Engine, and
every asynchronous operation goes through the Phase 2 JobService.
