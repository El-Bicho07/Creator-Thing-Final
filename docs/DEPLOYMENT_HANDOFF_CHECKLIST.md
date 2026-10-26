# Deployment Handoff Checklist — Creator Platform SaaS

This checklist defines the exact actions required to take Creator Platform SaaS to live production, organized by ownership.

---

## A. I Must Do — Accounts & Credentials

*Perform these in your official provider dashboards. Never share secrets in chat or commit them to source control.*

### 1. Supabase Dashboard (`https://supabase.com/dashboard`)
- [ ] **Navigate to**: Project `whlgvashrwxlzadbnktp` $\rightarrow$ **Project Settings** $\rightarrow$ **Database**.
- [ ] **Configure Role & Password**:
  - In SQL Editor, run the role creation snippet (Section B.1) to create `api_user` with a strong random password.
  - *Keep this password secret.*
- [ ] **Copy Connection Pooler URL**:
  - Under **Connection String**, select **URI**.
  - Set Mode to **Session** (Port `5432`).
  - Copy the connection string:
    `postgresql+asyncpg://api_user:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`
  - *Where to enter*: `DATABASE_URL` in Render.
- [ ] **Copy Supabase Keys**:
  - Go to **Project Settings** $\rightarrow$ **API**.
  - Copy **Project URL** $\rightarrow$ *Where to enter*: `SUPABASE_URL` (Render) and `NEXT_PUBLIC_SUPABASE_URL` (Vercel).
  - Copy **anon public key** $\rightarrow$ *Where to enter*: `SUPABASE_ANON_KEY` (Render) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel).
  - Copy **JWT Secret** $\rightarrow$ *Where to enter*: `SUPABASE_JWT_SECRET` (Render only — *never in Vercel*).

---

### 2. Render Dashboard (`https://dashboard.render.com`)
- [ ] **Create Web Service**:
  - Click **New +** $\rightarrow$ **Web Service** (or use Blueprint with `render.yaml`).
  - Connect your GitHub repository.
  - Set **Language/Runtime**: `Docker`.
  - Set **Dockerfile Path**: `./Dockerfile` (or `./apps/api/Dockerfile`).
  - Set **Context**: `.` (Root directory).
  - Set **Instance Type**: **Standard** (2 GB RAM, 1 CPU). *Required for E5 embeddings.*
- [ ] **Enter Environment Variables**:
  - `APP_ENV` = `production`
  - `PORT` = `8000`
  - `EMBEDDING_DEVICE` = `cpu`
  - `DATABASE_URL` = Your Supabase Session Pooler URL from Step 1.
  - `SUPABASE_URL` = `https://whlgvashrwxlzadbnktp.supabase.co`
  - `SUPABASE_ANON_KEY` = Your Supabase anon key.
  - `SUPABASE_JWT_SECRET` = Your Supabase JWT secret.
  - `CORS_ORIGINS` = `http://localhost:3000` (update to Vercel domain once frontend is created).
- [ ] **Deploy Backend**: Click **Create Web Service** and wait for the build to complete.
- [ ] **Copy Render API URL**: Copy your public URL (e.g. `https://creator-platform-api.onrender.com`).

---

### 3. Vercel Dashboard (`https://vercel.com`)
- [ ] **Create Vercel Project**:
  - Click **Add New** $\rightarrow$ **Project** $\rightarrow$ Import your Git repository.
  - Set **Framework Preset**: `Next.js`.
  - Set **Root Directory**: `apps/web`.
- [ ] **Enter Environment Variables**:
  - `NEXT_PUBLIC_API_URL` = Your Render API URL (e.g. `https://creator-platform-api.onrender.com`).
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://whlgvashrwxlzadbnktp.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key.
- [ ] **Deploy Frontend**: Click **Deploy** and copy your Vercel domain (e.g. `https://creator-platform-saas.vercel.app`).
- [ ] **Update CORS on Render**:
  - Go back to Render Dashboard $\rightarrow$ Environment.
  - Update `CORS_ORIGINS` to include your Vercel domain:
    `CORS_ORIGINS=https://creator-platform-saas.vercel.app,http://localhost:3000`
  - Save changes (Render will automatically redeploy).

---

## B. I Must Approve — Production-Impacting Operations

- [ ] **Approve & Execute Database Role Creation**:
  Create the non-superuser application role `api_user` in Supabase SQL editor:
  ```sql
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_user') THEN
          CREATE ROLE api_user WITH LOGIN PASSWORD '<STRONG_PASSWORD>'
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
- [ ] **Approve & Execute Schema Migrations**:
  Run migrations `001_enable_extensions.sql` through `009_coach_learning.sql` in Supabase SQL Editor.
- [ ] **Approve Hosting Plan / Spending**:
  Render Standard Web Service plan (~$25/month) to provide the 2 GB RAM required for the Python sentence-transformers/e5-base embeddings.

---

## C. OpenCode Completed Locally

All local deployment preparation is complete, hardened, and verified:

1. **Docker Configuration**:
   - `Dockerfile` (Root): Production multi-stage build, non-root user (`appuser`), dynamic `$PORT` binding, prompt assets copied, healthcheck configured.
   - `apps/api/Dockerfile`: Updated for standalone builds with dynamic `$PORT` and non-root execution.
   - `apps/web/Dockerfile`: Production Next.js multi-stage build with unprivileged `nextjs` user.
   - `.dockerignore` (Root, `apps/api`, `apps/web`): Excludes `.git`, `.venv`, `node_modules`, `modules/`, and `.env` credentials.
2. **CORS & Routing Hardening**:
   - `apps/api/app/main.py`: Updated to dynamically read allowed origins from `CORS_ORIGINS`.
   - `apps/web/lib/*-api.ts`: Updated `baseUrl()` across all API clients to defensively strip trailing slashes and prevent duplicate `/api/api/...` routes.
3. **PaaS Configuration**:
   - `render.yaml`: Standard plan specification (2GB RAM), healthcheck `/health`, and variable schema with `sync: false`.
   - `apps/web/vercel.json`: Monorepo Next.js configuration.
   - `.env.example`: Updated with `CORS_ORIGINS` and production guidance.
4. **Automation Scripts**:
   - `scripts/preflight_deployment.py`: Verifies environment variables and database connectivity without logging secrets.
   - `scripts/smoke_test_deployment.py`: Probes deployed backend and frontend URLs for health, CORS, and authentication fail-closed enforcement.
5. **Documentation**:
   - `docs/PRODUCTION_DEPLOYMENT.md`: Complete production runbook.
   - `docs/DEPLOYMENT_HANDOFF_CHECKLIST.md`: This action checklist.
6. **Automated Test Baselines Verified**:
   - Backend: 1,142 passed, 0 failed.
   - Frontend: 38 passed, 0 failed.
   - Frontend Typecheck: 0 errors.
   - Frontend Production Build: 12 static pages built.

---

## D. We Must Verify Together (Post-Deployment)

Once you deploy to Render and Vercel:

- [ ] **Run Automated Smoke Test**:
  ```bash
  python scripts/smoke_test_deployment.py \
    --api-url https://<your-render-url>.onrender.com \
    --web-url https://<your-vercel-url>.vercel.app
  ```
- [ ] **Live User Sign Up**:
  - Open `https://<your-vercel-url>.vercel.app/login`.
  - Sign up with a real email and password.
  - Verify account is created in Supabase Auth and auto-redirects to `/today`.
- [ ] **Live Operational Verification**:
  - **Today** (`/today`): Plan loads without "Missing authentication token".
  - **Studio** (`/studio`): Capabilities and sessions load.
  - **Coach** (`/coach`): Goals and learnings load without "Failed to fetch".
  - **Phase 2** (`/phase2`): Shows `Authentication: token present` and `Memory service: ok`.
- [ ] **Sign Out Verification**:
  - Click **Sign Out** in the navigation bar.
  - Verify session is cleared, private data is unmounted, and browser redirects to `/login`.

---

## E. Optional Later Improvements

- [ ] Add custom domains (e.g. `app.yourdomain.com` on Vercel, `api.yourdomain.com` on Render) via CNAME records.
- [ ] Configure Sentry DSN (`SENTRY_DSN`) for production error tracking.
- [ ] Set up automated database point-in-time recovery (PITR) in Supabase.
- [ ] Configure GitHub Actions CI/CD to run `pytest` and `npm test` before auto-deploying.
