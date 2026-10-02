# Stage 6 — Skill-Based Content Generation

> **Wave W2 · runs in parallel with Stage 3 and Stage 5.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building `packages/skills`: one **declarative skill module per content format**.
This is where ContentYou's output quality actually lives.

`PS.md` is explicit about what a skill owes the creator:

> *"I want the model to have dedicated skills for each type of content creation... with the
> plan, suitable edit/s, hooks, core content, right time to post... best hashtags, tags,
> etc, captions... It should also suggest the right edits such as what morph, hook, songs,
> etc. by reviewing from viral going reels/shorts/videos. Also, I want the plan to suggest
> right agentic/AI tools that can be used for production of the content."*

So a skill's output is **not a block of text**. It is a structured production brief a
creator can act on without thinking: hook, beats, B-roll, edit and morph directions, audio
suggestions, hashtags, post time, and which AI tools to use to produce it.

Each skill is a **data module**, not a function with a prompt buried in it. That shape is
what makes Stage 10's eval harness possible: prompts become measurable artifacts you can
score and iterate on, rather than strings scattered through the graph.

---

## Wave & siblings

Running **now, in parallel**: Stage 3 (auth) and Stage 5 (the graph).

**Stage 5 is building the graph that will call your skills.** You do not wait for it, and it
does not wait for you. You both meet at `SkillRegistryPort` (frozen in Stage 0): Stage 5
orchestrates, you supply. Each skill must be **independently testable** with no graph present.

You use the **real** `packages/ai` from Wave 1 — but only through `LlmPort`.

---

## File ownership

- **Own (exclusive write):** `packages/skills/**`
- **Read only:** `packages/schemas/**`, `packages/ai/**`, `CLAUDE.md`, `docs/`, `PS.md`
- **Must not touch:** `apps/agent/**` (Stage 5), `apps/web/**` (Stage 3/8),
  `packages/ai/**`, `packages/db/**`

---

## Read first

1. `CLAUDE.md` — **§3.1 (rate limits — Flash-class models)**, §9 (never invent statistics)
2. `docs/ARCHITECTURE.md` — §6.2 (the execute subgraph that will call you)
3. `packages/schemas/src/` — the `Artifact` discriminated union. **Your output must satisfy
   it exactly.**
4. `PS.md` — paragraphs 21–23, the richest description of what output should contain

---

## Context you can rely on

- **You are writing for a Flash-class model.** Gemini Pro is not on the free tier
  (`CLAUDE.md` §3.1). Prompts must be explicit and well-structured rather than relying on a
  large model to infer intent. The critic pass compensates for the capability gap.
- **`packages/ai` handles pacing, caching, retry and structured output.** Call `LlmPort` and
  let it wait.
- **The plan arrives already researched and cited.** Your skills consume `Plan` +
  `ResearchDoc[]`. **Ground your suggestions in those sources** — the `provenance.planClaimIds`
  chain must survive into the artifact (`docs/ARCHITECTURE.md` §4).
- **Never invent an engagement statistic or a "best time to post"** (§9). If it isn't in the
  research or the user's own data, do not assert it.

---

## Deliverables

### 1. Skill contract — `packages/skills/src/types.ts`

Every skill is the same declarative shape:

```ts
interface Skill<TArtifact> {
  id: string;
  format: ArtifactFormat;
  systemPrompt: string;          // the craft knowledge for this format
  outputSchema: ZodSchema<TArtifact>;
  exemplars: Exemplar[];         // few-shot, showing good vs weak
  rubric: RubricCriterion[];     // what the critic scores
  validators: Validator[];       // deterministic, non-LLM checks
  buildPrompt(ctx: SkillContext): string;
}
```

Note the split: **validators are deterministic code, the rubric is LLM-scored.** Anything
checkable without a model (character counts, duration bounds, hashtag counts, banned
patterns) belongs in a validator — cheaper, faster, and reliable in a way an LLM judgement
is not.

### 2. The six skills — `packages/skills/src/skills/`

| Skill | Format-specific craft it must encode |
|---|---|
| `yt-long-script` | hook (first 15s), retention beats, chapter structure, B-roll cues, CTA placement, title + thumbnail concepts |
| `yt-shorts` | vertical, sub-60s, loop-friendly ending, hook in first 1–2s, on-screen text beats |
| `ig-reel` | **9:16, 5–90s** (schema-enforced), hook frame, **morph/transition directions**, audio/song suggestion, text overlay timing, cover frame |
| `linkedin-post` | professional register, hook line before the "see more" fold, whitespace rhythm, credibility signals, comment-bait close |
| `x-thread` | per-post character limit, hook post, one idea per post, numbering, thread-closing CTA |
| `captions` | per-platform caption + **hashtag strategy** (mix of broad/niche/branded), alt text, first-comment strategy |

Plus, on every artifact, per `PS.md`: **suggested post time** (from the plan's audience
analysis, not invented), **tags**, and **recommended production tools** (which AI/agentic
tool to use for this specific piece — e.g. a voice tool for a VO-led Short vs an editor for
a morph-heavy Reel).

**Three reels.** `PS.md` asks for 3 Reels from one idea. They must be **genuinely different
angles** on the idea — not three rewrites of one script. Encode that in the prompt and
**test it**: a similarity check across the three hooks should fail if they converge.

### 3. Critic — `packages/skills/src/critic.ts`

One rubric-driven critic reused across skills. Scores an artifact against its skill's rubric,
returns per-criterion scores plus concrete, actionable revision notes ("the hook states a
fact; make it a tension") rather than a number alone.

One bounded revision attempt (env), then accept with flagged weaknesses. Same reasoning as
Stage 5's critic bound: an unbounded loop eats the day's quota.

### 4. Validators — `packages/skills/src/validators/`

Deterministic, no LLM:
- length bounds per platform (X post limit, LinkedIn fold, caption limits)
- **Reel duration within 5–90s and 9:16** (`CLAUDE.md` §3.4)
- hashtag count and format
- required fields present and non-empty
- **no fabricated-statistic pattern** — flag numeric claims with no `planClaimId` backing.
  This is a cheap, high-value guard on the product's core promise.

### 5. Sequenced executor — `packages/skills/src/executor.ts`

Generates the six formats **serially** (`CLAUDE.md` §9 — parallel will 429 and kill the run).

- concurrency from env, **default 1**
- one format's failure does not abort the rest; collect and report
- progress callback so Stage 5 can emit `RunEvent`s
- **shared context reuse**: the plan and research are prompt-prefix-stable across skills, so
  order the prompts to maximise cache hits in `packages/ai`

### 6. Registry — `packages/skills/src/registry.ts`

`SkillRegistry implements SkillRegistryPort`. Stage 5 resolves skills through this. Adding a
seventh format later must require **no change in `apps/agent`** — that is the test of whether
the abstraction is right.

---

## Constraints & guardrails

- **Never generate the six in parallel.** Serial, default concurrency 1.
- **Never invent statistics, benchmarks or engagement numbers** (§9). Ground in the plan's
  cited research or say you cannot.
- **Never let prompts drift out of the skill modules** into the graph. Skills are data.
- **Never bypass `LlmPort`** — no direct provider calls.
- Output must satisfy the `Artifact` union **exactly**; do not extend the schema here. If a
  field is missing, raise it rather than adding one.
- Write prompts for a **Flash-class** model.
- Dependencies in `packages/skills/package.json`, justified.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 6's Evidence log.

```bash
pnpm typecheck --filter @contentyou/skills
pnpm lint --filter @contentyou/skills
pnpm test --filter @contentyou/skills
```

Tests run against the fake provider — no network, deterministic.

- [ ] **All six skills** produce schema-valid artifacts from a fixture plan.
- [ ] **Registry completeness**: a table-driven test asserts every `ArtifactFormat` in the
      schema has a registered skill — so adding a format without a skill fails CI.
- [ ] **Reel duration validator** rejects 3s and 120s, accepts 30s.
- [ ] **X thread validator** rejects an over-limit post.
- [ ] **LinkedIn validator** catches a hook longer than the fold.
- [ ] **Three distinct reels**: generate 3 from one plan and assert hook dissimilarity above
      a threshold. Paste the three hooks as evidence — this is a quality claim, so show it.
- [ ] **Fabricated-statistic guard**: an artifact asserting "engagement rose 340%" with no
      backing `planClaimId` is flagged.
- [ ] **Provenance survives**: every artifact carries non-empty `provenance.planClaimIds`
      resolvable to the fixture plan.
- [ ] **Serial execution**: instrument the fake provider and assert no two generations
      overlap.
- [ ] **Partial failure**: force skill 4 to throw → the other five still return, executor
      reports partial.
- [ ] **Critic bound**: a permanently-failing artifact stops after the max and is accepted
      with flagged weaknesses.
- [ ] **Critic improves output**: a deliberately weak hook gets a revision note naming the
      specific weakness, not a generic one.
- [ ] **Production-tool suggestions** are present and specific to the format.

---

## Checkpoint update

Tick Stage 6's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 6's section.

---

## Out of scope

Graph orchestration (Stage 5) · schedule persistence — you *suggest* a time, Stage 7 decides
and persists it · UI (Stage 8) · profile learning (Stage 9) · eval harness (Stage 10 — but
your rubrics are its input, so write them to be machine-scorable).

---

## Harness notes

**Claude Code** — the `claude-api` skill covers structured output and prompting patterns
worth reading before you write the first prompt. `superpowers:test-driven-development` fits
the validators especially well.

**Antigravity** — no skills. In plain terms: write each validator's failing test first, then
implement. For the prompts, iterate against the fake provider and the rubric rather than
eyeballing single outputs.

**Both** — the quality checkboxes (three distinct reels, critic improves output) need you to
actually read the generated text, not just assert schema validity. Paste real output as
evidence.
