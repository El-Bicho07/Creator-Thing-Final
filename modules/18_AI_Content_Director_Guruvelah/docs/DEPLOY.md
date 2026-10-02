# Step-by-Step Deployment Guide

Follow these steps to deploy the Trend-to-Content Engine to Vercel with Supabase and Google Gemini.

---

## 1. Supabase Database & Auth Setup

1. Sign up / log into [Supabase](https://supabase.com).
2. Create a new project (e.g. `trend-engine-production`).
3. Open the **SQL Editor** tab in your Supabase project dashboard.
4. Open the [`supabase/schema.sql`](../supabase/schema.sql) file from this repository, copy all SQL code, paste it into the SQL Editor, and click **Run**.
5. Go to **Project Settings -> API** to copy:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon / Public Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
6. Go to **Authentication -> URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (update to Vercel URL after deployment).
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**.

---

## 2. Google Gemini AI Key Setup

1. Log into [Google AI Studio](https://aistudio.google.com).
2. Click **Get API Key** and generate a new key.
3. Save this key as `GEMINI_API_KEY`.

---

## 3. Local Verification

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in your Supabase and Gemini keys in `.env.local`.
3. Run local server:
   ```bash
   npm run dev
   ```
4. Test signup, onboarding, and generating a content package at `http://localhost:3000`.

---

## 4. Deploying to Vercel

1. Push your repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New -> Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add all environment variables listed in `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `AI_MODEL=gemini-1.5-flash`
   - `DAILY_GENERATION_LIMIT=15`
   - `DAILY_REGEN_LIMIT=60`
   - `TREND_REGION=IN`
   - `CRON_SECRET=your-random-secret`
   - `NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app`
5. Click **Deploy**.
6. After Vercel completes deployment, update your Supabase Auth **Site URL** and **Redirect URLs** to your production Vercel domain (`https://your-vercel-domain.vercel.app/auth/callback`).

---

## 5. Troubleshooting Common Issues

- **Setup Required Screen Renders:** Check Vercel Environment Variables. Ensure variable names match `.env.example` exactly with no extra quotes.
- **Auth Redirect Loop:** Verify `NEXT_PUBLIC_SITE_URL` and Supabase Auth Redirect URLs match your Vercel deployment domain.
- **429 Rate Limit Error:** The free Gemini AI tier has rate limits. Upgrade to `gemini-1.5-pro` or reduce generation frequency if quota is exceeded.
- **Trend Ingestion Errors:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is provided in environment variables for global trend writes.
