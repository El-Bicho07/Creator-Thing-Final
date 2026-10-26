# Production Deployment Runbook — Creator Platform SaaS

This document provides the authoritative, step-by-step production deployment runbook for the Creator Platform SaaS.

---

## 1. Architecture & Hosting Topology

The system comprises three decoupled tiers:

| Tier | Component | Production Target | Hardware / Runtime Sizing |
|---|---|---|---|
| **Frontend** | Next.js 15 (`apps/web`) | **Vercel** | Node.js 20, Edge / Serverless |
| **Backend API** | FastAPI (`apps/api`) | **Render** (Docker Web Service) | Minimum **2 GB RAM**, 1 CPU Core (`standard` plan) |
| **Database & Auth** | PostgreSQL 16 + pgvector + Auth | **Supabase** (`https://whlgvashrwxlzadbnktp.supabase.co`) | Managed Postgres with pgvector extension |

### Crucial Hardware Requirement
The backend loads the `intfloat/multilingual-e5-base` sentence transformer model (768 dimensions, ~1.1 GB weights) and spaCy `en_core_web_sm` into CPU RAM.
- **Minimum Memory**: **2 GB RAM**.
- **Container Sizing**: Using a 512 MB or 1 GB instance will trigger the Linux Out-Of-Memory (OOM) killer (`exit code 137`).
- **Worker Concurrency**: Set `WEB_CONCURRENCY=1` so that only one worker process loads the PyTorch model into RAM.

---

## 2. Directory Layout & Build Contexts

- **Repository Root**: `/` (Monorepo root)
- **Backend API**: `apps/api`
  - Dockerfile: `./Dockerfile` (or `./apps/api/Dockerfile`)
  - Build Context: `.` (Monorepo root, required to copy `packages/prompts`)
  - Healthcheck Endpoint: `GET /health` and `GET /api/health`
- **Frontend Web**: `apps/web`
  - Root Directory in Vercel: `apps/web`
  - Framework: `Next.js`
  - Build Command: `next build`
  - Output Directory: `.next`

---

## 3. Environment Variables Reference

### Backend Service (Render / Railway / Docker)

| Variable | Required | Description | Example / Safe Value |
|---|---|---|---|
| `APP_ENV` | Yes | Application environment mode | `production` |
| `PORT` | Yes | HTTP listen port (injected by host) | `8000` or `10000` |
| `DATABASE_URL` | Yes | Asyncpg database connection pooler URL | `postgresql+asyncpg://api_user:<SECRET>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `ADMIN_DATABASE_URL` | No | Direct database URL for migrations (RLS-bypass) | `postgresql+asyncpg://postgres:<SECRET>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://whlgvashrwxlzadbnktp.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase public/anon key | `<your-supabase-anon-key>` |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT signing secret | `<your-supabase-jwt-secret>` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins | `https://your-app.vercel.app` |
| `EMBEDDING_DEVICE` | Yes | Embedding inference compute target | `cpu` |
| `EMBEDDING_MODEL` | No | Selected model (defaults in code) | `intfloat/multilingual-e5-base` |
| `EMBEDDING_DIMENSION`| No | Vector dimensionality | `768` |
| `WEB_CONCURRENCY` | No | Uvicorn worker count (keep at 1) | `1` |

### Frontend Application (Vercel)

| Variable | Required | Description | Example / Safe Value |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Deployed backend public URL (no trailing slash) | `https://creator-platform-api.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `https://whlgvashrwxlzadbnktp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Yes | Supabase public browser key | `<your-supabase-anon-key>` |

> **Security Rule**: Never expose `DATABASE_URL`, `SUPABASE_JWT_SECRET`, or `ADMIN_DATABASE_URL` to Vercel or any `NEXT_PUBLIC_*` variable.

---

## 4. Supabase Database Migration Procedure

### 4.1 Migration Inventory
All versioned SQL migrations live under `infra/db/migrations/`:
1. `001_enable_extensions.sql` — Enables `vector`, `uuid-ossp`, `pgcrypto`.
2. `000_create_api_user.sql` — Creates the `api_user` non-superuser role (modified for Supabase `postgres` db).
3. `002_core_schema.sql` — Core schema, `current_user_id()` function, tables, and RLS policies.
4. `003_embedding_768_expand.sql` — Expands vector columns and adds provenance metadata.
5. `004_embedding_768_contract.sql` — Promotes `embedding` column to 768-d with cosine indexing.
6. `005_voice_profile_uniqueness.sql` — Enforces single primary voice profile per creator.
7. `006_studio_sessions.sql` — Studio session workspace and critiques.
8. `007_today_plan.sql` — Today operational plans and Producer runs.
9. `008_growth_domain.sql` — Analytics, comments, and experiments.
10. `009_coach_learning.sql` — Coach goals and durable learning vault.

### 4.2 Ordered Execution in Supabase Dashboard
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and select project `whlgvashrwxlzadbnktp`.
2. Open the **SQL Editor**.
3. **Step 1: Extensions**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "vector";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```
4. **Step 2: Dedicated Application Role**:
   Create a dedicated non-superuser role so that database connections enforce Row Level Security:
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_user') THEN
           CREATE ROLE api_user WITH LOGIN PASSWORD '<CHOOSE_STRONG_PASSWORD>'
               NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
       END IF;
   END
   $$;

   GRANT CONNECT ON DATABASE postgres TO api_user;
   GRANT USAGE ON SCHEMA public TO api_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO api_user;
   ```
5. **Step 3: Core Schema**:
   Paste and run `infra/db/migrations/002_core_schema.sql`.
6. **Step 4: Vector Dimensions**:
   Paste and run `infra/db/migrations/003_embedding_768_expand.sql` followed by `infra/db/migrations/004_embedding_768_contract.sql`.
7. **Step 5: Feature Schemas**:
   Paste and run migrations `005`, `006`, `007`, `008`, and `009` in order.

### 4.3 Connection Pooler Mode Guidance
In Supabase (**Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection String**):
- **Port 5432 (Session Mode)**: **REQUIRED** for FastAPI `DATABASE_URL`.
  - The application uses `set_config('request.jwt.claims', ...)` on pinned connections to enforce RLS per request.
  - Transaction mode (Port 6543) breaks session-level configurations across commits. Connect using Port `5432` on the pooler host (e.g. `aws-0-<region>.pooler.supabase.com:5432/postgres`).

---

## 5. Backend Deployment (Render)

1. Sign in to [Render](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint** (or **Web Service**).
   - If using Blueprint: Render will automatically detect `render.yaml` in the repo root.
   - If manual Web Service:
     - **Name**: `creator-platform-api`
     - **Runtime**: `Docker`
     - **Dockerfile Path**: `./Dockerfile` (or `./apps/api/Dockerfile`)
     - **Docker Context**: `.` (Root)
     - **Instance Type**: `Standard` (2 GB RAM)
     - **Health Check Path**: `/health`
3. Enter the environment variables listed in Section 3.
4. Click **Create Web Service**.
5. Once deployed, test the health check:
   ```bash
   curl -i https://<your-render-service>.onrender.com/health
   ```
   Expected response: `HTTP 200 OK` with `{"status":"ok","service":"creator-platform-api"}`.

---

## 6. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com) $\rightarrow$ **Add New Project**.
2. Select the GitHub repository.
3. Configure the monorepo settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
4. Add the frontend environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g. `https://creator-platform-api.onrender.com`)
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://whlgvashrwxlzadbnktp.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`
5. Click **Deploy**.
6. Note your Vercel deployment URL (e.g. `https://creator-platform-saas.vercel.app`).
7. **Update Backend CORS**: Return to Render, add your Vercel domain to `CORS_ORIGINS`, and redeploy.

---

## 7. Verification & Production Smoke Testing

Run the automated smoke test script locally against the deployed URLs:

```bash
python scripts/smoke_test_deployment.py \
  --api-url https://creator-platform-api.onrender.com \
  --web-url https://creator-platform-saas.vercel.app
```

The script automatically verifies:
1. Public health checks (`/health` and `/api/health`).
2. Protected endpoints reject unauthenticated requests with `401 Unauthorized`.
3. CORS preflight headers properly approve the Vercel origin.
4. Frontend is reachable and serving HTTP 200.

---

## 8. Rollback Procedures

- **Backend (Render)**:
  - In Render Dashboard $\rightarrow$ Web Service $\rightarrow$ **Deploys** $\rightarrow$ select the previous successful build $\rightarrow$ click **Rollback**.
- **Frontend (Vercel)**:
  - In Vercel Dashboard $\rightarrow$ Deployments $\rightarrow$ select the previous successful deployment $\rightarrow$ click **Promote to Production**.
- **Database (Supabase)**:
  - Before applying migrations, generate a backup via Supabase Dashboard (**Database** $\rightarrow$ **Backups** $\rightarrow$ **Take backup**).
  - Schema changes in migrations 005–009 are non-destructive and backward compatible.
