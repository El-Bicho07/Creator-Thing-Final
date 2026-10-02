# 07 — CoverCraft (Thumbnail Ideator)

AI Instagram Reel cover concept generator. Given a Reel description (and
optional creator photo), Gemini decides the strongest visual hook —
face-first, visual-first, text-first, hybrid, comparison, story-moment, or
minimal, including recommending **no text at all** — and returns 3 distinct
cover concepts with an editable 9:16 preview, Instagram grid preview, refine
flow, and PNG export.

**Student:** Sanadhani · **Assigned No.:** 07 · **Branch:** `07_Thumbnail_Ideator`

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Google GenAI SDK (Gemini) for structured concept generation, validated with Zod
- html-to-image for PNG export

## Setup
```bash
npm install
cp .env.example .env.local   # then add your own Gemini key
npm run dev
```
Open http://localhost:3000.

Get a free Gemini API key at https://aistudio.google.com/apikey.

If no key is set (or the Gemini call fails), the app falls back to
realistic demo concepts for the built-in examples so the workflow can still
be demonstrated end-to-end, with a small "Demo mode" indicator.

## What it does
1. Pick a content type, describe the Reel, optionally upload a creator photo, pick a visual vibe (or let AI decide).
2. Gemini analyzes the content and returns a recommended strategy plus 3 meaningfully different cover concepts.
3. Each concept renders as an actual 9:16 cover (using the photo if provided), editable inline (text, font, size, color, position, overlay) without needing to re-call Gemini.
4. Toggle between Reel view and a mock Instagram grid view, with a "Show Safe Zone" overlay.
5. Refine any concept with a free-text instruction, generate 3 new variations, copy the concept to clipboard, or download a 1080×1920 PNG.

## Notes
- No auth, no database, no payments — single-page MVP as scoped.
- The Gemini API key is only ever used server-side, in `app/api/generate/route.ts`.
