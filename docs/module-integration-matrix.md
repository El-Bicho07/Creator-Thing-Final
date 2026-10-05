# Module Integration Matrix — Creator SaaS Platform (Solo Creator OS)

*Generated during Phase 0 Audit. This document provides a comprehensive inventory and integration analysis of all 24 donor prototype modules located in `modules/`.*

---

## Overview Summary

| Total Modules Inspected | Core Integrated | Ported / Donor | Parked | Rebuilt / New |
|:---:|:---:|:---:|:---:|:---:|
| 24 | 6 | 13 | 3 | 2 |

- **CORE**: Primary architectural foundation modules (Voice Replicator, Second Brain, Content Director, Comment Analyzer/To-Content, Autonomous Pipeline).
- **PORT / PROMPT-DONOR**: Specific features, prompt assets, or UI utilities extracted and converted into shared micro-services or studio stages.
- **PARKED**: Non-essential features for v1 core creator loop (Screenplay, Collaboration Finder, Podcast Assistant, Brand Pitch).
- **REBUILD / NEW**: Conceptual modules lacking functional source code or required new SaaS capabilities (Creative Producer, Analytics Copilot).

---

## Comprehensive Module Inventory Matrix

| Module | Purpose | Frontend Stack | Backend Stack | Database | Auth | AI Provider & Models | Key Reusable Services / Prompts | Integration Value | Disposition |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **01_Content_Idea_Generator** | Generate 10 content ideas based on topic & target audience | Express/EJS, Vanilla JS | Express (Node.js) | None | None | Gemini (`gemini-1.5-flash`) | Reusable idea generation prompts & structured idea output schemas | High | **PORT / PROMPT-DONOR** |
| **02_Content_Repurposer** | Convert 1 content input into LinkedIn, Instagram, X, and YouTube versions | Vite + React + Tailwind | FastAPI (Python) | None | None | Gemini (`gemini-1.5-flash`) via LangChain | Multi-platform formatting logic, platform tone adapters | High | **PORT / PROMPT-DONOR** |
| **03_Hook_Generator** | Generate 10 high-converting hooks across 5 emotional styles | Next.js + React + Tailwind | Next.js API Routes | None | None | Gemini (`gemini-2.5-flash`) via `@google/genai` | Hook taxonomy (Curiosity, Negative, Story, Data-driven) & prompt templates | High | **PORT / PROMPT-DONOR** |
| **04_Daily_Content_Planner** | Turn niche & goal into today's content plan and task breakdown | Next.js + Framer Motion | Next.js API Routes | MongoDB | None | Gemini (`gemini-1.5-flash`) | Daily content task scheduling & calendar generation logic | High | **CORE / PORT** |
| **05_Reel_Script_Builder** | Turn idea into structured 30–60s Reel script (Hook, Body, Visuals, CTA) | HTML/JS | FastAPI | None | None | Gemini (`gemini-1.5-flash`) via LangChain | Short-form script structuring, scene timing, B-roll cues | High | **PORT / PROMPT-DONOR** |
| **06_Clip_Finder** | Analyze video transcripts & identify viral short-form clips with timestamps | Streamlit | FastAPI + Faster-Whisper + yt-dlp | SQLite | None | Anthropic (`claude-3-haiku`) + Local Whisper | Transcript sectioning, virality scoring algorithms | Medium | **PORT / REFERENCE** |
| **07_Thumbnail_Ideator** | Generate visual thumbnail concepts, text overlays, and color palettes | Next.js + html-to-image | Next.js API Routes | None | None | Gemini (`gemini-2.5-flash`) | Thumbnail visual composition generator & text overlay prompts | High | **PORT / PROMPT-DONOR** |
| **08_Caption_Assistant** | Turn draft or image description into platform-optimized caption & hashtags | Next.js | Flask (Python) | None | None | Gemini / Anthropic | Caption presets, hashtag clustering, tone adjustment prompts | High | **PORT / PROMPT-DONOR** |
| **09_CTA_Generator** | Generate contextual calls-to-action tailored to conversion goals | Next.js + Three.js | Next.js API Routes | None | None | Anthropic (`claude-3-5-sonnet`) | Conversion goal CTA taxonomy (Lead magnet, Follow, Sales) | High | **PORT / PROMPT-DONOR** |
| **10_Comment_Analyzer** | Analyze audience comments into sentiment, themes, questions & opportunities | Next.js | Express + SQLite | SQLite | None | Gemini (`gemini-1.5-flash`) | Comment sentiment analyzer & question extraction logic | High | **CORE / PORT** |
| **11_Comment_to_Content** | Convert audience comments/questions into future post & video script drafts | Next.js + Recharts | FastAPI + SQLAlchemy | pgvector / SQLite | Supabase Auth | Anthropic (`claude-3-5-sonnet`) | Audience question-to-content transformer, vector clustering | High | **CORE / PORT** |
| **12_Creator_Research_Assistant** | Research topic into key facts, angles, myth-busting & sources | Next.js + Tailwind | Next.js API Routes | None | None | Gemini (`gemini-2.5-flash`) | Research synthesis, source finder & myth-buster prompts | High | **PORT / PROMPT-DONOR** |
| **13_Voice_Replicator** | Analyze creator content to extract style metrics, writing fingerprint & enforce voice | Next.js + Tailwind | FastAPI + SQLAlchemy + pgvector + spaCy | Postgres + pgvector | None | Gemini (`gemini-2.5-flash`) + sentence-transformers | `apps/api/app/voice/` engine (Analyzer, Profile, Style Validator) | Critical Core | **CORE / PORT** |
| **14_Podcast_Assistant** | Turn podcast transcript into episode titles, show notes & chapter timestamps | Next.js | Express / FastAPI | None | None | Gemini / OpenAI | Long-form audio transcript summarizer & chapter generator | Low / Medium | **PARK / REFERENCE** |
| **15_Creator_Workspace** | Organize content drafts across stages (Idea → Research → Script → Published) | React + Vite | Express | JSON File | None | Gemini / Groq | Kanban stage state machine & workspace document model | Medium | **PORT / REFERENCE** |
| **16_Content_Recycler** | Analyze historical content performance & decay to recommend top reposts | React + Vite + Recharts | Express | MongoDB / JSON | None | Anthropic (`claude-3-haiku`) | Content decay scoring algorithm & evergreen tagger | High | **PORT / PROMPT-DONOR** |
| **17_Brand_Pitch_Builder** | Generate tailored sponsorship proposals & rates based on creator metrics | React + Vite + html2pdf | Express + LangChain | SQLite | None | Gemini (`gemini-1.5-flash`) | Sponsorship proposal generator & rate calculator | Low | **PARK / REFERENCE** |
| **18_AI_Content_Director** | 7-stage content production pipeline (Research → Angle → Script → Visuals → Copy) | Next.js + Tailwind | Next.js API Routes | Postgres | Supabase Auth | Anthropic (`claude-3-5-sonnet`) | 7-Stage linear production pipeline architecture | High | **CORE / PORT** |
| **18_AI_Content_Director_Guruvelah** | Multi-agent creator onboarding, profile setup, and production pipeline execution | Next.js + shadcn/ui | Next.js API Routes / FastAPI | Postgres + Supabase | Supabase Auth | Gemini (`gemini-2.5-flash`) | Start onboarding flow, creator profile setup UI components | Critical Core | **CORE / PORT** |
| **19_Creator_Second_Brain** | Long-term content memory, RAG semantic search & knowledge graph | Next.js + react-force-graph | FastAPI + SQLAlchemy + pgvector + fastembed | Postgres + pgvector | None | Groq (`llama-3.3-70b`) / Gemini | `apps/api/app/memory/` engine (Assets, Chunks, Hybrid Vector Search) | Critical Core | **CORE / PORT** |
| **20_AI_Screenplay_Workspace** | AI screenplay scriptwriting workspace with character bible & scene memory | Next.js + TypeScript | FastAPI + LangChain + LangGraph | ChromaDB + MongoDB | None | Gemini (`gemini-1.5-pro`) | Character bible continuity validator | Low | **PARK / REFERENCE** |
| **21_Autonomous_Content_Pipeline** | Multi-format content pipeline (Idea → YT, Reel, LinkedIn, X) + scheduler | Next.js + Turborepo | Express | MongoDB | BetterAuth | Gemini / Anthropic | Multi-channel orchestrator, scheduler domain model | High | **CORE / PORT** |
| **22_AI_Creative_Producer** | Strategic 30-day content plan generator & adaptive performance optimizer | None | None | None | None | None | None (Folder contains only README.md & .gitignore) | High | **REBUILD** |
| **26_Creator_Collaboration_Finder** | Find compatible creator collaboration partners based on audience overlap | Next.js | FastAPI | None | None | Gemini (`gemini-1.5-flash`) | Creator matching logic | Low | **PARK** |

---

## Module Mapping into Product Navigation

| Navigation Section | Source Donor Modules | Key Capabilities Integrated |
|:---|:---|:---|
| **Start** (`/start`) | `13_Voice_Replicator`, `18_AI_Content_Director_Guruvelah` | Creator onboarding, Niche & Audience definition, Initial Voice Profile generation, Past content ingestion setup |
| **Today** (`/today`) | `04_Daily_Content_Planner`, `21_Autonomous_Content_Pipeline`, `22_AI_Creative_Producer` | Daily recommendation dashboard, Priority task queue, Time-budget allocation, Fallback ideas |
| **Studio** (`/studio`) | `01`, `02`, `03`, `05`, `07`, `08`, `09`, `12`, `18_AI_Content_Director` | 7-Stage content production pipeline (Idea → Research → Angle → Hook → Script → Visuals → Caption & CTA → Multi-platform format) |
| **Coach** (`/coach`) | `21` Critic module, `13` Voice Validator, `24` Analytics Copilot | Content review scorecard, Voice alignment feedback, Performance improvement suggestions, Weekly actionable lessons |
| **Growth** (`/growth`) | `10_Comment_Analyzer`, `11_Comment_to_Content`, `19_Creator_Second_Brain`, `24_Analytics_Copilot` | Comment sentiment & theme analysis, Comment-to-content idea extraction, Audience insights dashboard, Performance analytics |
| **Library** (`/library`) | `19_Creator_Second_Brain`, `13_Voice_Replicator`, `16_Content_Recycler`, `15_Creator_Workspace` | Vector semantic search ("Have I posted this?"), Reusable asset vault, Voice profile editor, Content recycling recommendations |
