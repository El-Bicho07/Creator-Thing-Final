# Creator Second Brain

A second brain for YouTube creators: index a channel's transcripts, then ask questions about everything the creator has ever said.

| Feature | What it does |
|---|---|
| **Ask** — "Have I talked about this before?" | Semantic search over every transcript. Answers are grounded with `[n]` citations that play the exact moment. Verdict: covered / partially / new, plus a fresh angle. |
| **Reels** — "What can become a reel?" | Ranked 15–60 s moments scored on hook, standalone value, emotion and takeaway, with a suggested hook and caption. |
| **Promise Ledger** | Pulls out every on-camera commitment ("part 2 coming soon") and checks whether a later video delivered it. |
| **Opinion Drift** | Plots the creator's stance on a topic over time and flags reversals and contradictions. |
| **Ghost Clip Composer** | Builds a new Short by stitching hook → proof → payoff moments from different videos. Previews them back to back and exports an EDL (Premiere/Resolve) plus a shot list. |
| **Connections** | Similarity graph of all videos. Shows recurring themes and which videos to cross-link. |

## Stack

FastAPI · PostgreSQL + pgvector · BGE embeddings (local, via fastembed) · Groq (Llama 3.3 70B, Whisper) · Next.js 16 + Tailwind · Recharts · react-force-graph · YouTube Data API v3 + IFrame Player API

```
backend/
  main.py, config.py, db.py, models.py
  ingest/   youtube.py (Data API), transcripts.py (captions, .srt/.vtt, Whisper, chunking), pipeline.py (background jobs)
  search/   embeddings.py, vector.py (pgvector queries), graph.py
  ai/       llm.py (Groq JSON + retry), analyze.py (reels/promises/stances per video),
            ask.py, promises.py, drift.py, compose.py (+ EDL export)
  api/      routes.py
frontend/
  app/page.tsx                   channel onboarding
  app/channel/[id]/...           ask, reels, promises, drift, compose, connections, videos
  components/ClipPlayer.tsx      YouTube player that plays single clips or sequences
```

## Run it

Prerequisites: Docker Desktop, Python 3.12, Node 20+.

1. **Keys.** Copy `.env.example` to `.env` and fill in `YOUTUBE_API_KEY` (Google Cloud Console → YouTube Data API v3) and `GROQ_API_KEY` (console.groq.com).
2. **Database.**
   ```bash
   docker compose up -d
   ```
3. **Backend** (first run only: `py -3.12 -m venv backend/.venv` then `backend/.venv/Scripts/pip install -r backend/requirements.txt`):
   ```bash
   backend/.venv/Scripts/python -m uvicorn main:app --app-dir backend --port 8000
   ```
4. **Frontend** (first run only: `npm install --prefix frontend`):
   ```bash
   npm run dev --prefix frontend
   ```
5. Open http://localhost:3000, paste a channel URL, and click **Build my brain**.

The first run downloads the embedding model (~70 MB) into `backend/.model_cache`.

## How indexing works

1. Resolve the channel and list its latest N uploads (YouTube Data API).
2. Fetch timestamped captions, then split them into ~45 s chunks. Each chunk keeps line-level timestamps so clips can be cut precisely.
3. Embed each chunk locally with BGE-small (384-dim) and store it in pgvector. Search works from this point on, even without Groq.
4. Make one Groq call per video (more for long videos) to extract reel candidates, promises and stances as JSON.
5. Match each promise against later videos by vector search, then have the LLM verify it.

Rate limits on Groq's free tier are handled with automatic backoff. A 50-video channel can take a while on the free tier, and the progress bar shows each stage.

## Known limitations

- **YouTube can block transcript downloads** from some IPs (`RequestBlocked`). Those videos are marked *Blocked by YouTube*. Options: re-index later, set `TRANSCRIPT_PROXY`, or upload `.srt`/`.vtt` files (YouTube Studio → Subtitles → Download) or audio (≤25 MB, transcribed by Groq Whisper) per video on the **Videos** tab.
- Videos with no captions at all need an upload the same way.
- The EDL references YouTube video IDs. Relink the clips to the creator's original source files in the editor.
- Single user, no auth (MVP).
