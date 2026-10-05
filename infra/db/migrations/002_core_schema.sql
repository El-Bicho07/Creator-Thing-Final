-- Migration 002: Core schema with RLS policies
-- This migration creates all core tables with Row Level Security
-- Standalone PostgreSQL version (no Supabase auth schema dependency)

-- Helper function to get current user ID from JWT
-- In production with Supabase, this would be auth.uid()
-- For standalone, we'll use a session variable set by middleware
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        nullif(current_setting('request.jwt.claims', true), '')::json->>'sub',
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create users table (replaces auth.users from Supabase)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMPTZ,
    confirmation_token VARCHAR(255),
    confirmation_sent_at TIMESTAMPTZ,
    recovery_token VARCHAR(255),
    recovery_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    raw_app_meta_data JSONB DEFAULT '{}',
    raw_user_meta_data JSONB DEFAULT '{}',
    is_super_admin BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'authenticated'
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_self_access ON users
    FOR ALL USING (current_user_id() = id) WITH CHECK (current_user_id() = id);

-- For RLS policies, we'll use current_user_id() instead of auth.uid()
-- The API middleware will set the request.jwt.claims session variable

-- 1. creator_profiles
CREATE TABLE creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    niche VARCHAR(100) NOT NULL,
    target_audience TEXT NOT NULL,
    primary_platform VARCHAR(50) NOT NULL,
    content_goals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_creator_profiles_isolation ON creator_profiles
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

-- 2. voice_profiles
CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    style_name VARCHAR(100) DEFAULT 'Primary Style',
    pacing_score FLOAT NOT NULL DEFAULT 0.5,
    vocabulary_richness FLOAT NOT NULL DEFAULT 0.5,
    tone_fingerprint JSONB NOT NULL DEFAULT '{}',
    formatting_rules JSONB NOT NULL DEFAULT '[]',
    forbidden_words JSONB NOT NULL DEFAULT '[]',
    sample_texts JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_voice_profiles_isolation ON voice_profiles
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

-- 3. content_assets
CREATE TABLE content_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    raw_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_content_assets_isolation ON content_assets
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_content_assets_user_id ON content_assets(user_id);
CREATE INDEX idx_content_assets_source_type ON content_assets(source_type);
CREATE INDEX idx_content_assets_created_at ON content_assets(created_at DESC);

-- 4. chunks (for vector embeddings)
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_chunks_isolation ON chunks
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_chunks_user_id ON chunks(user_id);
CREATE INDEX idx_chunks_asset_id ON chunks(asset_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. ideas
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    angle TEXT,
    target_format VARCHAR(50),
    status VARCHAR(50) DEFAULT 'backlog',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_ideas_isolation ON ideas
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status);

-- 6. plan_items
CREATE TABLE plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    priority INT DEFAULT 1,
    estimated_minutes INT DEFAULT 30,
    completed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_plan_items_isolation ON plan_items
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_plan_items_user_id ON plan_items(user_id);
CREATE INDEX idx_plan_items_plan_date ON plan_items(plan_date);
CREATE INDEX idx_plan_items_completed ON plan_items(completed);

-- 7. performance_records
CREATE TABLE performance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES content_assets(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares INT DEFAULT 0,
    published_at TIMESTAMPTZ,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_performance_records_isolation ON performance_records
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_performance_records_user_id ON performance_records(user_id);
CREATE INDEX idx_performance_records_asset_id ON performance_records(asset_id);
CREATE INDEX idx_performance_records_published_at ON performance_records(published_at DESC);

-- 8. comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES content_assets(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    author_hash VARCHAR(64),
    sentiment VARCHAR(20),
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_comments_isolation ON comments
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_asset_id ON comments(asset_id);
CREATE INDEX idx_comments_sentiment ON comments(sentiment);

-- 9. comment_insights
CREATE TABLE comment_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50),
    summary TEXT NOT NULL,
    extracted_questions JSONB DEFAULT '[]',
    actionable_idea TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comment_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_comment_insights_isolation ON comment_insights
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_comment_insights_user_id ON comment_insights(user_id);

-- 10. lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_feature VARCHAR(50) NOT NULL,
    insight_summary TEXT NOT NULL,
    actionable_rule TEXT NOT NULL,
    applied_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_lessons_isolation ON lessons
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_lessons_user_id ON lessons(user_id);
CREATE INDEX idx_lessons_source_feature ON lessons(source_feature);

-- 11. jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    total INT DEFAULT 100,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_jobs_isolation ON jobs
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- 12. ai_calls
CREATE TABLE ai_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    prompt_version VARCHAR(20) NOT NULL,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0.0,
    latency_ms INT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_ai_calls_isolation ON ai_calls
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_ai_calls_user_id ON ai_calls(user_id);
CREATE INDEX idx_ai_calls_feature ON ai_calls(feature);
CREATE INDEX idx_ai_calls_created_at ON ai_calls(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_profiles_updated_at BEFORE UPDATE ON voice_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_assets_updated_at BEFORE UPDATE ON content_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_items_updated_at BEFORE UPDATE ON plan_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();