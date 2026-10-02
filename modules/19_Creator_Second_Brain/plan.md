# Plan: Making Creator Second Brain agentic with LangChain

## 1. Where we are today

The backend is a **fixed pipeline**. Each feature is one hard-coded retrieve-then-prompt function:

| Feature | Today | Limitation |
|---|---|---|
| Ask (`ai/ask.py`) | 1 vector search → 1 Groq call | Can't rephrase, search again, or narrow by date/video |
| Compose (`ai/compose.py`) | 1 search → 1 call → Python fixes bad clips | Never checks its own output or retries a weak sequence |
| Promises (`ai/promises.py`) | search → yes/no per promise | Can't look at the full transcript when an excerpt is ambiguous |
| Drift (`ai/drift.py`) | stance search → 1 call | Topic must be exact; no follow-up questions |
| Indexing (`ingest/pipeline.py`) | linear steps in one function | No retry or branching per video; logic is tangled with job-status updates |

All LLM traffic goes through `ai/llm.py::chat_json` (Groq JSON mode). There's no conversation memory, and no component decides *what to do next*.

## 2. Goal

The backend becomes a **team of agents**. They reason, call tools, check their own work and hand off to each other, all through LangChain and LangGraph:

- **One chat entry point.** The creator asks anything ("Did I ever promise a Lightroom video, and could I make a Short about it from old clips?"). A supervisor agent picks the specialists it needs and combines their answers.
- **Internal specialist agents.** Each has its own tools and prompt.
- **Indexing as an agent graph.** It has per-video branching, retries and self-checks.
- **Existing pages keep working.** Current REST endpoints stay and are served by the agents internally, so no frontend page breaks.

## 3. Tech choices

| Piece | Choice | Why |
|---|---|---|
| LLM wrapper | `langchain-groq` (`ChatGroq`) | Stays on Groq with the same models (`gpt-oss-120b` / `20b`) and supports tool calling |
| Agents | `langchain` 1.x `create_agent` (ReAct tool loop) | Standard way to build tool-calling agents |
| Orchestration | `langgraph` `StateGraph` | Supervisor routing, the indexing workflow, streaming, recursion limits |
| Structured output | Pydantic models + `with_structured_output` | Replaces hand-written JSON parsing and validation |
| Memory / threads | `langgraph-checkpoint-sqlite` (file `backend/data/agent_state.sqlite`) | Uses Python's built-in `sqlite3`. Postgres checkpointing needs `psycopg`, which Smart App Control blocks (see `config.py`) |
| Streaming to UI | Server-Sent Events from `graph.astream(..., stream_mode=["updates","messages"])` | The UI shows "Researcher is searching…" live |
| Tracing (optional) | LangSmith via env vars | Off by default |

We'll pin exact versions at build time after checking the current releases.

## 4. Agent architecture

```
                       ┌──────────────────────────┐
  POST /agent/chat ──▶ │   Supervisor ("Brain")   │  plans, routes, merges, answers
                       └───────────┬──────────────┘
          ┌──────────────┬─────────┼───────────┬──────────────┬───────────────┐
          ▼              ▼         ▼           ▼              ▼               ▼
     Researcher     Clip Editor  Promise    Drift          Connections    Strategist
     (ask/search)   (reels +     Auditor    Analyst        (graph /       (video ideas,
                    compose)                               related)       gap finding)
          │              │         │           │              │               │
          └──────────────┴─────────┴──── shared tools ───────┴───────────────┘
                 search_transcripts · get_transcript_window · list_videos
                 search_stances · list_promises · search_reels · related_videos
```

### 4.1 Supervisor ("Brain")
- A LangGraph supervisor node. Each specialist is exposed to it as a tool (the "agents as tools" pattern), which keeps routing simple and debuggable.
- Breaks multi-part questions into steps and calls specialists in sequence or in parallel.
- Writes the final answer with timestamp citations, and returns structured "cards" (sources, clips, drift points) that the UI can render.
- Guardrails: `recursion_limit ≈ 12`, and each specialist is limited to a few tool calls. Groq rate limits make runaway loops expensive.

### 4.2 Specialist agents

| Agent | Tools | Behaviour gained over today |
|---|---|---|
| **Researcher** | `search_transcripts(query, after?, before?, video_id?)`, `get_transcript_window(video_id, start, end)`, `list_videos` | Rewrites the query and searches again when similarity is low, reads surrounding context before answering, returns the same verdict (`covered/partially/new`) and citations |
| **Clip Editor** | `search_reels`, `search_transcripts`, `get_transcript_window`, `validate_sequence` | Drafts a Short, then `validate_sequence` checks durations, ≥2 source videos, the hook→payoff arc and snapped boundaries. If validation fails, it revises (max 2 rounds). The current snapping logic in `compose.py` moves into this tool |
| **Promise Auditor** | `list_promises`, `search_transcripts(after=…)`, `get_transcript_window`, `set_promise_status` | Reads the full context when unsure and explains its verdict. Manually edited promises stay protected |
| **Drift Analyst** | `list_stance_topics`, `search_stances`, `get_transcript_window` | Resolves fuzzy topics ("cameras" → "used cameras", "mirrorless"), then plots positions and shifts (same output as today) |
| **Connections** | `related_videos`, `video_graph_summary` | Answers "what else have I made like this?", suggests playlists |
| **Strategist** (new) | calls the other specialists' tools | "What should my next video be?" It combines open promises, opinion shifts and uncovered angles into ranked ideas |

### 4.3 Indexing graph (background, not chat)

`run_index_job` becomes a LangGraph `StateGraph`. Job status is updated in one place, a callback on each node.

```
resolve_channel → list_videos → ┬─ for each video (fan-out) ─────────────────────┐
                                │  fetch_transcript ─(blocked)→ mark_blocked      │
                                │        │ ok                                    │
                                │  chunk_and_embed → analyze_video → quality_check│
                                │                        ▲              │ fail   │
                                │                        └── retry once ┘        │
                                └─────────────────────────────────────────────────┘
                                        → promise_auditor (batch) → done
```

- `analyze_video` uses a structured-output Pydantic schema (`VideoAnalysis` with reels, promises and stances) instead of a hand-written JSON schema.
- `quality_check` is deterministic: are quotes actually present in the transcript, timestamps in range, topics normalised? If not, it re-prompts once with the errors listed.
- Concurrency stays low (1–2 videos at a time) because of Groq rate limits.

## 5. Proposed code layout

```
backend/
  agents/
    __init__.py
    llm.py            # ChatGroq factory (main / fast), retry + rate-limit handling
    schemas.py        # Pydantic outputs: AskAnswer, Composition, PromiseVerdict, DriftAnalysis, VideoAnalysis…
    tools/
      search.py       # search_transcripts, get_transcript_window, search_stances, search_reels
      library.py      # list_videos, list_promises, set_promise_status, related_videos, graph summary
      compose.py      # validate_sequence (+ EDL / shot-list helpers moved from ai/compose.py)
    specialists/
      researcher.py  clip_editor.py  promise_auditor.py  drift_analyst.py  connections.py  strategist.py
    supervisor.py     # Brain graph + checkpointer
    indexing_graph.py # StateGraph for ingestion
    streaming.py      # graph events → SSE payloads
  ai/                 # kept as thin compatibility wrappers that call the agents
  api/routes.py       # existing routes now call agents; new /agent/* routes added
```

Tools get the DB session and `channel_id` from the agent's runtime context, never from the LLM, so an agent can't read another channel's data.

## 6. API changes

| Endpoint | Change |
|---|---|
| `POST /api/channels/{id}/agent/chat` | **New.** Body `{message, thread_id?}`. Streams SSE events: `step` (which agent / tool is running), `token`, `card` (sources, clips, drift), `final` |
| `GET /api/channels/{id}/agent/threads` / `GET …/threads/{tid}` | **New.** Conversation history |
| `POST /ask`, `/compose`, `/drift`, `/promises/recheck` | **Same request and response shapes**, now backed by the matching specialist agent |
| `POST /index`, `/reindex` | Same, now run through the indexing graph; the job's `stage` text shows the current graph node |

## 7. Frontend changes (small)

- New **"Brain" chat tab** in `channel/[id]/layout.tsx`: message list, a live "agent is doing X" step trail, and the existing `RichText` / source cards reused for results.
- `lib/api.ts`: an SSE helper (`fetch` + `ReadableStream`) and new types.
- Existing pages unchanged. Optionally, the Ask page shows the agent's step trail.

## 8. Build phases

1. **Foundation.** Add dependencies, `agents/llm.py`, `schemas.py` and the tools layer, with unit tests for the tools against the existing DB.
2. **Specialists.** Researcher, Clip Editor, Promise Auditor, Drift Analyst, Connections. Point the existing routes at them and confirm each page still works in the browser.
3. **Supervisor + chat.** Brain graph, SQLite checkpointer, SSE endpoint, thread endpoints.
4. **Indexing graph.** Replace `run_index_job` / `run_upload_job` / `run_promise_job`, then re-index GS Auto Motives and compare the results.
5. **Frontend.** Brain chat tab and streaming UI.
6. **Strategist + polish.** Idea agent, token/rate-limit guardrails, optional LangSmith tracing, README and `Steps_to_Run.txt` updates.

Each phase leaves the app runnable.

## 9. Risks and mitigations

- **Groq rate limits.** Agent loops make several calls per question. Mitigations: recursion limits, the fast model for sub-agents where quality allows, keep the existing backoff logic, and a clear UI message when throttled.
- **Tool-calling reliability of `gpt-oss` models.** Validate early in Phase 1. Fallback: a Groq model with stronger tool use, configured via `.env`.
- **Latency.** Agentic answers take longer than today's single call. Streaming step updates keeps the UI responsive.
- **Windows / Smart App Control.** Only pure-Python or already-allowed wheels; no `psycopg`.

## 10. Decisions needed from you

1. **Checkpointer:** SQLite file (recommended) or in-memory only (chat history lost on restart)?
2. **Scope of first build:** all 6 phases, or stop after Phase 3 (agents + chat) and review?
3. **Strategist agent:** include it, or keep only the agents that mirror existing features?
