# Cue — CTA Generator

**Problem:** Creators struggle with calls-to-action that don't sound repetitive.

**Solution:** Cue generates contextual, on-brand calls-to-action for Instagram creators based on their goal (follow, save, comment, share, link-in-bio, etc.), post context, and tone — so every post gets a CTA that fits instead of the same three lines recycled forever.

## Overview

- Enter your post's context (topic, caption/description) and pick a goal.
- Cue generates a set of varied, non-repetitive CTA options tailored to that goal and tone.
- Runs fully offline on a template engine by default; optionally connect an Anthropic API key for AI-generated CTAs.
- History of past generations is kept locally (IndexedDB) so you can revisit or reuse earlier CTAs.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **3D / visuals:** React Three Fiber, Three.js, @shadergradient/react, Motion
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — optional, falls back to an offline template engine
- **Storage:** idb-keyval (IndexedDB) for local history
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (e2e)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in as needed:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Claude API key. Leave empty and Cue runs entirely on its offline template engine. |
| `CUE_MODEL` | No | Model used for generation (default `claude-opus-5`). `claude-sonnet-5` or `claude-haiku-4-5` are cheaper/faster. |
| `CUE_EFFORT` | No | Generation effort/quality tradeoff (default `medium`). |
| `CUE_RATE_PER_MIN` | No | Per-IP rate limit per minute for AI endpoints (default `10`). |
| `CUE_RATE_PER_DAY` | No | Per-IP rate limit per day for AI endpoints (default `80`). |

> No API key is required to try the app — it works out of the box with the offline template engine.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run tests (optional)

```bash
npm run test        # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run typecheck    # TypeScript
```

## Project Structure

```
src/
├── app/            # Next.js routes (pages, layout, API routes, history page)
├── components/     # UI components (Studio, deck, shader background, nav)
tests/              # Playwright e2e tests
```

## Scope

Instagram-only by design — CTA phrasing, goals, and tone presets are tailored specifically to Instagram creator content (not repurposed for other platforms).
