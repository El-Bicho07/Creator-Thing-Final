# ADR 001: Unified Architecture & Shared Technology Stack

- **Status:** Approved
- **Date:** 2026-10-03
- **Deciders:** Senior Software Architect / Integration Lead

---

## Context & Problem Statement

The repository `Creator-Platform-SaaS` contains 24 donor prototype modules imported from student projects. These prototypes were created independently using incompatible stacks:
- **Frontend Frameworks:** Next.js (Pages & App router), React + Vite, Streamlit, HTML/JS, Express/EJS.
- **Backend Frameworks:** FastAPI, Express (Node.js), Flask, Next.js API Routes.
- **Databases & Vector Stores:** PostgreSQL, pgvector, SQLite, MongoDB, ChromaDB, JSON files.
- **Authentication:** Supabase Auth, BetterAuth, None (unauthenticated prototypes).
- **AI Providers & Libraries:** Gemini (`@google/genai`, `google-generativeai`, `langchain-google-genai`), Anthropic, Groq, OpenAI, Ollama.
- **Embedding Models:** `sentence-transformers` (768d), `fastembed` (384d), OpenAI (`text-embedding-3-small`).
  - Donor Module 13 used `all-MiniLM-L6-v2` (384d) with deterministic hash fallback.
  - Donor Module 19 used `BAAI/bge-small-en-v1.5` (384d) via fastembed.
  - **Unified standard: `intfloat/multilingual-e5-small` (384d) via sentence-transformers** — validated per ADR-002.

Running 24 separate applications or maintaining multiple database/vector technologies is unsustainable for a single cohesive SaaS application.

---

## Decision Drivers

1. **One Coherent Experience:** Single account, single database, single navigation, and unified design system.
2. **Strict Multi-Tenant Isolation:** Guaranteed tenant data separation via database Row Level Security (RLS) and JWT auth.
3. **Shared Creator Intelligence:** The creator's voice (Module 13) and long-term memory (Module 19) must be shared services across all product features.
4. **Maintainability & Performance:** Modular monolith architecture with Next.js frontend, FastAPI backend, and PostgreSQL + pgvector.

---

## Considered Options

1. **Option A (Microservices):** Keep each module running as an independent microservice container behind an API Gateway.
2. **Option B (Framework Convergence):** Port all donor capabilities into a single Next.js + FastAPI modular monolith with PostgreSQL + pgvector.

---

## Decision Outcome

**Chosen Option: Option B (Unified Modular Monolith)**

### Selected Stack Specifications:
1. **Frontend:** Next.js 15 (App Router) in `apps/web` with React, Tailwind CSS, Lucide icons, and Supabase Auth client.
2. **Backend API:** FastAPI in `apps/api` with Pydantic v2, async SQLAlchemy 2.0, and spaCy.
3. **Database & Vector Store:** PostgreSQL with `pgvector` extension and Supabase Row Level Security (RLS).
4. **Unified Embedding Standard:** `intfloat/multilingual-e5-small` (384 dimensions) via `sentence-transformers` for all content asset chunking and RAG memory search. Donor Module 13 and Module 19 embeddings require full re-embedding to this unified vector space (see ADR-002).
5. **AI Gateway:** Centralized LLM Gateway (`apps/api/app/llm/gateway.py`) enforcing provider fallback, retry, rate limiting, and structured validation.

---

## Consequences

### Positive:
- Single database connection pool and unified migration strategy.
- Voice intelligence and Second Brain vector retrieval work seamlessly across Studio, Today, Coach, and Growth.
- Zero duplicate authentication systems or scattered API keys.

### Negative / Mitigation:
- Code from donor modules using MongoDB, ChromaDB, or SQLite must be refactored to PostgreSQL / pgvector schemas.
- Direct client-side AI API calls in donor prototypes must be routed through the FastAPI backend LLM gateway.
