-- Migration 009: Coach & Learning domain state (Phase 6).
--
-- Phase 6 implements "Coach + Learning":
-- Learn about creator -> Coach creator -> Track improvement -> Durable learning -> Feed Producer/Today/Studio.
--

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. coach_goals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'skill',
    target_date TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    progress_status VARCHAR(30) NOT NULL DEFAULT 'insufficient_evidence',
    progress_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_goals DROP CONSTRAINT IF EXISTS coach_goals_status_check;
ALTER TABLE coach_goals
    ADD CONSTRAINT coach_goals_status_check
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));

ALTER TABLE coach_goals DROP CONSTRAINT IF EXISTS coach_goals_progress_check;
ALTER TABLE coach_goals
    ADD CONSTRAINT coach_goals_progress_check
    CHECK (progress_status IN ('improving', 'stable', 'needs_attention', 'insufficient_evidence'));

CREATE INDEX IF NOT EXISTS idx_coach_goals_user_id ON coach_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_goals_status ON coach_goals(user_id, status);

-- ---------------------------------------------------------------------------
-- 2. coach_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES coach_goals(id) ON DELETE SET NULL,

    topic VARCHAR(255) NOT NULL,
    context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coach_sessions DROP CONSTRAINT IF EXISTS coach_sessions_status_check;
ALTER TABLE coach_sessions
    ADD CONSTRAINT coach_sessions_status_check
    CHECK (status IN ('active', 'completed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_id ON coach_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_goal ON coach_sessions(goal_id);

-- ---------------------------------------------------------------------------
-- 3. coach_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    observation TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    what_to_improve TEXT NOT NULL,
    how_to_practice TEXT NOT NULL,
    what_to_try_next TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_feedback_user_id ON coach_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_feedback_session ON coach_feedback(session_id);

-- ---------------------------------------------------------------------------
-- 4. learning_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    category VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    detail TEXT,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
    confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_type VARCHAR(50) NOT NULL DEFAULT 'coaching_session',
    source_id VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'candidate',
    is_explicit BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE learning_records DROP CONSTRAINT IF EXISTS learning_category_check;
ALTER TABLE learning_records
    ADD CONSTRAINT learning_category_check
    CHECK (category IN (
        'creator_preference', 'content_strength', 'content_weakness',
        'workflow_pattern', 'audience_pattern', 'skill_progress', 'lesson'
    ));

ALTER TABLE learning_records DROP CONSTRAINT IF EXISTS learning_status_check;
ALTER TABLE learning_records
    ADD CONSTRAINT learning_status_check
    CHECK (status IN ('candidate', 'confirmed', 'rejected', 'superseded'));

CREATE INDEX IF NOT EXISTS idx_learning_records_user_id ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_status ON learning_records(user_id, status);

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE coach_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation_policy ON coach_goals;
CREATE POLICY user_isolation_policy ON coach_goals
    FOR ALL USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS user_isolation_policy ON coach_sessions;
CREATE POLICY user_isolation_policy ON coach_sessions
    FOR ALL USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS user_isolation_policy ON coach_feedback;
CREATE POLICY user_isolation_policy ON coach_feedback
    FOR ALL USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS user_isolation_policy ON learning_records;
CREATE POLICY user_isolation_policy ON learning_records
    FOR ALL USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- Grant permissions to api_user
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_goals TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_sessions TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_feedback TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_records TO api_user;

COMMIT;
