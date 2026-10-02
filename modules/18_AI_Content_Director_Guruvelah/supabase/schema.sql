-- ============================================================================
-- TREND-TO-CONTENT ENGINE — DATABASE SCHEMA (Supabase PostgreSQL)
-- ============================================================================
-- HOW TO USE THIS FILE:
-- 1. Log into your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Open your project, navigate to the "SQL Editor" tab in the sidebar.
-- 3. Click "New Query", paste the entire contents of this file, and click "Run".
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to automatically populate public.users on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. CREATOR PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  sub_niche TEXT,
  target_audience TEXT NOT NULL,
  platform TEXT NOT NULL,
  tone TEXT[] NOT NULL DEFAULT '{}',
  content_style TEXT,
  experience_level TEXT,
  creator_description TEXT,
  memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own creator profile"
  ON public.creator_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3. TRENDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- null = globally ingested
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'user', -- user | google_trends | hacker_news
  source_url TEXT,
  source_metrics JSONB DEFAULT '{}'::jsonb,
  source_snippets JSONB DEFAULT '[]'::jsonb,
  trend_score NUMERIC, -- nullable, unused in MVP
  lifecycle_stage TEXT, -- emerging | rising | peak | declining | evergreen | unknown
  lifecycle_basis TEXT, -- user | source | unknown
  analysis JSONB,
  analysis_hash TEXT,
  analyzed_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for ingested global trends deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_trends_source_title ON public.trends (source, lower(title)) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_trends_source_fetched ON public.trends (source, fetched_at DESC);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global trends and their own trends"
  ON public.trends FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom trends"
  ON public.trends FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 4. GENERATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL,
  input_topic TEXT NOT NULL,
  source_text TEXT,
  platform TEXT NOT NULL,
  content_goal TEXT NOT NULL,
  duration_seconds INT,
  trend_analysis JSONB,
  creator_angle TEXT,
  angle_details JSONB,
  content_concept TEXT,
  hooks JSONB,
  selected_hook TEXT,
  selected_hook_index INT,
  script JSONB,
  format TEXT,
  format_details JSONB,
  shot_list JSONB,
  cta TEXT,
  caption TEXT,
  hashtags JSONB,
  profile_snapshot JSONB,
  prompt_versions JSONB,
  edited_fields TEXT[] DEFAULT '{}',
  regeneration_counts JSONB DEFAULT '{}'::jsonb,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_created ON public.generations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_user_saved ON public.generations (user_id) WHERE is_saved = TRUE;

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own generations"
  ON public.generations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 5. GENERATION FEEDBACK TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_generation_feedback UNIQUE (generation_id, user_id)
);

ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and submit feedback for their own generations"
  ON public.generation_feedback FOR ALL
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.generations g
      WHERE g.id = generation_id AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.generations g
      WHERE g.id = generation_id AND g.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 6. USAGE EVENTS TABLE (Rate Limiting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('generation', 'regeneration', 'trend_analysis', 'trend_refresh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_kind_created ON public.usage_events (user_id, kind, created_at);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and record their usage events"
  ON public.usage_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 7. AI LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert AI logs"
  ON public.ai_logs FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- UPDATED_AT AUTOMATIC TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_creator_profiles_updated ON public.creator_profiles;
CREATE TRIGGER tr_creator_profiles_updated BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_trends_updated ON public.trends;
CREATE TRIGGER tr_trends_updated BEFORE UPDATE ON public.trends FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_generations_updated ON public.generations;
CREATE TRIGGER tr_generations_updated BEFORE UPDATE ON public.generations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
