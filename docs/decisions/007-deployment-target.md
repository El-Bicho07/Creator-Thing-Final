# Deployment Target & Dependencies — Creator Platform SaaS

*Documents the production deployment target decision and its architectural implications*

## Status

**PENDING HUMAN DECISION** — Production hosting platform not yet selected.

## Current Local Development Stack

| Component | Technology | Local Config |
|-----------|------------|--------------|
| Database | PostgreSQL 16 + pgvector | Docker (`pgvector/pgvector:pg16`) |
| API | FastAPI + Uvicorn | Docker (Python 3.12) |
| Web | Next.js 15 | Docker (Node 20) |
| Auth | Supabase Auth (JWT) | External Supabase project OR local mock |
| Vector Store | pgvector (in PostgreSQL) | Same as database |
| Embeddings | sentence-transformers (CPU) | Local, no external service |
| LLM | Via Gateway (mock/providers) | Mock or external APIs |

**All local development runs via**: `docker-compose -f infra/docker-compose.yml up`

---

## Production Deployment Options

### Option A: Supabase + Vercel (Recommended for Speed)

| Component | Platform |
|-----------|----------|
| Database + Auth | Supabase (PostgreSQL + pgvector + Auth) |
| API | Render / Fly.io / Railway (Docker) |
| Web | Vercel (Next.js native) |
| Secrets | Supabase Vault + Platform env vars |
| Vector Store | pgvector on Supabase |

**Pros**: 
- Supabase handles PostgreSQL + pgvector + Auth natively
- Vercel optimizes Next.js
- Managed services reduce ops burden

**Cons**:
- Vendor lock-in (Supabase + Vercel)
- Supabase free tier limits (500MB DB, 2GB bandwidth)
- Cross-region latency if API not co-located

**Architecture Impact**: 
- RLS policies use `auth.uid()` directly (Supabase native)
- No custom `current_user_id()` function needed
- JWT verification via Supabase SDK

### Option B: Self-Hosted Docker (Maximum Control)

| Component | Platform |
|-----------|----------|
| Database | PostgreSQL + pgvector (RDS, Cloud SQL, or self-managed) |
| Auth | Supabase Auth (external) OR custom JWT + `current_user_id()` |
| API | Kubernetes / ECS / Fly.io / Render / Railway |
| Web | Vercel / Netlify / Cloudflare Pages / Self-hosted |
| Secrets | HashiCorp Vault / AWS Secrets Manager / Platform native |
| Vector Store | pgvector in same PostgreSQL |

**Pros**:
- Full control over infrastructure
- No vendor lock-in
- Can optimize costs at scale
- Single PostgreSQL for all data

**Cons**:
- Operational overhead (backups, scaling, monitoring)
- Need to manage pgvector extension
- Auth requires custom implementation if not using Supabase

**Architecture Impact**:
- Current `current_user_id()` function works as-is
- RLS policies use `current_user_id()` session variable
- API connects as non-superuser `api_user` role

### Option C: Fully Managed (Supabase Only)

| Component | Platform |
|-----------|----------|
| Database + Auth + API + Web | Supabase (PostgREST + Edge Functions + Hosting) |

**Pros**: Single platform, zero ops
**Cons**: 
- No FastAPI — must rewrite API in Edge Functions (Deno/TypeScript)
- PostgREST instead of REST — different paradigm
- Limited compute for ML/embeddings

**Architecture Impact**: **Major rewrite required** — not compatible with current FastAPI architecture.

---

## Decisions Dependent on Deployment Target

| Decision | Depends On | Options |
|----------|------------|---------|
| **Auth Implementation** | Target | Supabase native `auth.uid()` vs custom `current_user_id()` |
| **RLS Policy Function** | Target | `auth.uid()` (Supabase) vs `current_user_id()` (custom) |
| **Database Connection Pooling** | Target | Supabase pooler (PgBouncer) vs PgBouncer self-managed vs none |
| **Secret Management** | Target | Supabase Vault / AWS Secrets Manager / HashiCorp Vault / Platform env vars |
| **Database Backups** | Target | Supabase automated vs self-managed pg_dump / WAL-G |
| **Read Replicas / Scaling** | Target | Supabase read replicas vs self-managed |
| **Vector Search Scaling** | Target | pgvector HNSW index vs IVFFlat vs external (Pinecone/Weaviate) |
| **Edge/Edge Functions** | Target | Supabase Edge / Cloudflare Workers / Vercel Edge / none |
| **Observability** | Target | Supabase logs / Datadog / Grafana / custom |
| **CI/CD Pipeline** | Target | GitHub Actions + platform deploy / custom |

---

## Recommended Decision Matrix

| Priority | Recommended | Rationale |
|----------|-------------|-----------|
| **Speed to production** | Supabase + Vercel | Managed services, native Next.js, native pgvector |
| **Cost at scale** | Self-hosted (Fly.io/Railway + managed PG) | Predictable pricing, no per-row fees |
| **Data sovereignty** | Self-hosted (EU/US region) | Full control over data location |
| **Team expertise** | Match team skills | If team knows K8s → K8s; if frontend-heavy → Vercel |

---

## Current Architecture Compatibility

| Deployment Option | Compatible with Current Architecture? | Changes Needed |
|-------------------|--------------------------------------|----------------|
| Supabase + Vercel | ⚠️ Partial | Replace `current_user_id()` with `auth.uid()`, use Supabase JWT |
| Self-Hosted Docker | ✅ Full | None (current architecture designed for this) |
| Supabase Only | ❌ No | Rewrite API to PostgREST/Edge Functions |

**Current architecture is designed for Option B (Self-Hosted Docker)** with Supabase Auth as external identity provider.

---

## Decision Required

**Human Decision Required**: Select production deployment target.

**Options**:
1. **Supabase + Vercel** — Fastest to market, some architecture changes
2. **Self-Hosted (Fly.io/Railway/Render + Managed PG)** — Full architecture compatibility, more ops
3. **Kubernetes (EKS/GKE/AKS)** — Maximum control, highest ops burden
4. **Other** — Specify

**Blocking**: Phase 2 can proceed with local development regardless. This decision affects:
- Production RLS implementation (`auth.uid()` vs `current_user_id()`)
- Secret management strategy
- CI/CD pipeline design
- Database backup/restore procedures

**Recommendation**: Decide before Phase 3 (Studio) to avoid rework.

---

## Local Development Unaffected

Regardless of production target, **local development continues to work** via:
```bash
docker-compose -f infra/docker-compose.yml up
```

The local stack (PostgreSQL + pgvector, FastAPI, Next.js) is deployment-agnostic.