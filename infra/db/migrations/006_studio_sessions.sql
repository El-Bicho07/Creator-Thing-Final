-- Migration 006: Studio sessions and generation history (Phase 3).
--
-- Studio is a multi-step workspace: session -> context -> generate -> review
-- -> refine -> save. Nothing in the Phase 2 schema models that, so two tables
-- are genuinely necessary.
--
-- Deliberately NOT added: any embeddings, memory, voice, job, or prompt table.
-- Phase 2 already owns all of those and Studio must reuse them rather than
-- create a second copy. Generated content bodies are stored in the existing
-- `content_assets` table (provenance in `metadata`), so there is no second
-- asset store either.
--
-- `studio_generations` provides version history so refinement never overwrites
-- the creator's only copy, and records enough provenance to answer
-- "how was this piece of content generated?".

BEGIN;

-- ---------------------------------------------------------------------------
-- studio_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),

    -- Workflow position, e.g. context -> generate -> review -> refine
    current_step VARCHAR(40) NOT NULL DEFAULT 'context',

    -- What the creator is working on (topic / brief / working title)
    brief TEXT,

    -- The content this session started from, when applicable
    idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,

    -- Capability that produced the current working content
    last_capability VARCHAR(60),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE studio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_studio_sessions_isolation ON studio_sessions
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_studio_sessions_user_id ON studio_sessions(user_id);
CREATE INDEX idx_studio_sessions_status ON studio_sessions(status);
CREATE INDEX idx_studio_sessions_created_at ON studio_sessions(created_at DESC);
CREATE INDEX idx_studio_sessions_idea_id ON studio_sessions(idea_id);

CREATE TRIGGER studio_sessions_updated_at
    BEFORE UPDATE ON studio_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- studio_generations
--
-- One row per generated version. `asset_id` points at `content_assets`, which
-- holds the body text and is already RLS-protected and already indexed by
-- `chunks`. Storing a second copy of the text here would be duplicate
-- persistence and a second thing to keep in sync.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studio_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,

    -- The content_assets row holding this version's body text
    asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,

    -- Monotonic per session: 1, 2, 3 ... Refinement appends, never overwrites.
    version INTEGER NOT NULL CHECK (version >= 1),

    -- Capability identity, e.g. 'script' or 'refine'
    capability VARCHAR(60) NOT NULL,
    prompt_name VARCHAR(120),
    prompt_version VARCHAR(20),

    -- Which generation this was derived from (refinement lineage)
    parent_generation_id UUID REFERENCES studio_generations(id) ON DELETE SET NULL,

    -- Structured critique attached to this version, when produced
    critique JSONB,

    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0.0,
    latency_ms INT DEFAULT 0,

    -- True when the creator explicitly approved this version.
    -- Studio never approves on the creator's behalf.
    creator_approved BOOLEAN NOT NULL DEFAULT FALSE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_studio_generations_isolation ON studio_generations
    FOR ALL USING (current_user_id() = user_id) WITH CHECK (current_user_id() = user_id);

CREATE INDEX idx_studio_generations_user_id ON studio_generations(user_id);
CREATE INDEX idx_studio_generations_session_id ON studio_generations(session_id);
CREATE INDEX idx_studio_generations_asset_id ON studio_generations(asset_id);
CREATE INDEX idx_studio_generations_created_at ON studio_generations(created_at DESC);

-- A session cannot contain two rows claiming the same version number.
CREATE UNIQUE INDEX idx_studio_generations_session_version
    ON studio_generations(session_id, version);

INSERT INTO schema_migrations (version, notes)
VALUES (
    '006_studio_sessions',
    'Studio sessions and generation version history with RLS. Reuses content_assets '
    'for generated bodies and adds no second vector store, asset store, or prompt table.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
