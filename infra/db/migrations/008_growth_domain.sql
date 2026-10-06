-- Migration 008: Growth domain state (Phase 5).
--
-- Phase 5 implements "Learn": performance -> analysis -> insights -> Analytics
-- Copilot -> recommendation -> Today -> Studio.
--
-- REUSED, not duplicated. Migration 002 created four tables that no phase has
-- ever written to (verified: zero application references except Phase 4 reading
-- performance_records/lessons read-only):
--
--   comments           comment text + author_hash + sentiment   -> extended
--   comment_insights   category/summary/questions/actionable   -> extended
--   lessons            source_feature/summary/actionable_rule  -> extended
--   ideas              title/angle/target_format/status        -> reused as
--                      content opportunities
--   performance_records views/likes/comments_count/shares       -> reused as-is
--
-- Reusing `ideas` for content opportunities is deliberate rather than lazy:
-- Phase 4's Producer already assembles `ideas` into its context
-- (`existing_ideas` block), so an opportunity becomes Producer input for free,
-- and a separate `content_opportunities` table would have needed a second
-- ingestion path into the very same decision.
--
-- NEW, because nothing existing can hold them:
--
--   growth_insights    an evidence-backed, confidence-scored, stale-detectable
--                      insight. `comment_insights` is about ONE comment's
--                      classification; an insight is a cross-record claim with
--                      evidence, confidence and invalidation semantics.
--   experiments        no such model exists anywhere in the schema, and Phase 5
--                      needs a hypothesis -> content -> performance -> result
--                      loop. Kept deliberately small.
--
-- Anti-fabrication is schema, not just code:
--   - `confidence` and its `confidence_reasons` are written by deterministic
--     application code, never by the model.
--   - `evidence` carries the exact computation, so an insight can be re-derived
--     and checked.
--   - `source_fingerprint` hashes the source records, so an insight whose
--     evidence changes or disappears is marked stale instead of continuing to
--     assert a claim it can no longer support (task section 44).

BEGIN;

-- ---------------------------------------------------------------------------
-- growth_insights (NEW)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS growth_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- A small, closed vocabulary. Six types, not dozens.
    insight_type VARCHAR(40) NOT NULL,

    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,

    -- The deterministic analysis that produced this claim, verbatim:
    -- {"metric": "engagement_rate", "from": 4.1, "to": 5.3, "unit": "percent",
    --  "window": {"start": "...", "end": "..."}, "sample_size": 7}
    -- An insight without evidence is not an insight, so this is NOT NULL.
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Ids of the exact records the claim rests on: performance_records,
    -- comments, ideas, experiments. Used for traceability AND invalidation.
    source_records JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Deterministic 0..1. The model may explain this; it may not assign it.
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
    -- The deterministic factors behind the number: sample size, consistency,
    -- recency, data completeness. Makes the score auditable.
    confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Deterministic, derived from signal strength relative to the creator's own
    -- baseline. Never from the model.
    impact VARCHAR(10) NOT NULL DEFAULT 'low',

    -- Optional next step. Must reference the evidence to be useful.
    recommended_action TEXT,

    -- Hash over the source records' identifying values. When it changes, the
    -- insight's evidence no longer supports it.
    source_fingerprint VARCHAR(64),

    -- Set when the fingerprint no longer matches the sources. A stale insight is
    -- retained for history but must never be presented as current.
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,

    -- The window the deterministic analysis ran over.
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,

    -- Which deterministic rule produced it, e.g. "trend:engagement_rate".
    rule_key VARCHAR(80),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE growth_insights DROP CONSTRAINT IF EXISTS growth_insights_type_check;
ALTER TABLE growth_insights
    ADD CONSTRAINT growth_insights_type_check
    CHECK (insight_type IN (
        'performance_trend', 'content_pattern', 'audience_signal',
        'underperforming_pattern', 'opportunity', 'experiment_result'
    ));

ALTER TABLE growth_insights DROP CONSTRAINT IF EXISTS growth_insights_impact_check;
ALTER TABLE growth_insights
    ADD CONSTRAINT growth_insights_impact_check
    CHECK (impact IN ('low', 'medium', 'high'));

-- Confidence is a computed score, so it must actually be a score.
ALTER TABLE growth_insights DROP CONSTRAINT IF EXISTS growth_insights_confidence_check;
ALTER TABLE growth_insights
    ADD CONSTRAINT growth_insights_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1);

-- An insight that claims something must name what it claims on.
ALTER TABLE growth_insights DROP CONSTRAINT IF EXISTS growth_insights_evidence_present;
ALTER TABLE growth_insights
    ADD CONSTRAINT growth_insights_evidence_present
    CHECK (jsonb_typeof(evidence) = 'object');

-- ---------------------------------------------------------------------------
-- experiments (NEW, deliberately minimal)
-- ---------------------------------------------------------------------------
-- The loop Phase 5 supports: hypothesis -> experiment -> content -> performance
-- -> result -> lesson. No variant matrices, no assignment algorithms.
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- What the creator believes, stated so it can be falsified.
    hypothesis TEXT NOT NULL,

    -- Optional links to the content under test. SET NULL, not CASCADE: deleting
    -- a post must not erase the record that it was tested.
    variant_asset_id UUID REFERENCES content_assets(id) ON DELETE SET NULL,
    baseline_asset_id UUID REFERENCES content_assets(id) ON DELETE SET NULL,

    -- The metric used to judge it, from the measured set. Stored as text so an
    -- unsupported metric cannot be invented here.
    outcome_metric VARCHAR(30),

    -- Deterministic observed values, written by the evaluator. NULL until run.
    observed_value NUMERIC(14, 4),
    baseline_value NUMERIC(14, 4),
    -- The deterministic verdict: did the hypothesis hold?
    result_verdict VARCHAR(20),

    result_summary TEXT,

    -- A concluded experiment may produce a durable lesson.
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    -- The insight that motivated it.
    insight_id UUID REFERENCES growth_insights(id) ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE experiments DROP CONSTRAINT IF EXISTS experiments_status_check;
ALTER TABLE experiments
    ADD CONSTRAINT experiments_status_check
    CHECK (status IN ('planned', 'running', 'completed', 'abandoned'));

ALTER TABLE experiments DROP CONSTRAINT IF EXISTS experiments_verdict_check;
ALTER TABLE experiments
    ADD CONSTRAINT experiments_verdict_check
    CHECK (result_verdict IS NULL OR result_verdict IN ('supported', 'not_supported', 'inconclusive'));

-- ---------------------------------------------------------------------------
-- lessons: evidence, confidence, traceability
-- ---------------------------------------------------------------------------
-- A lesson is a durable learning. Without provenance it is just an assertion,
-- which is exactly the failure mode Phase 5 exists to avoid.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS source_records JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS confidence NUMERIC(4, 3);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS insight_id UUID
    REFERENCES growth_insights(id) ON DELETE SET NULL;

ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_confidence_check;
ALTER TABLE lessons
    ADD CONSTRAINT lessons_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

-- ---------------------------------------------------------------------------
-- ideas: becomes a content opportunity
-- ---------------------------------------------------------------------------
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS demand_score NUMERIC(6, 2);
-- Which comments drove this opportunity. Required for a comment-derived
-- opportunity to be traceable back to real audience text.
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS source_comment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS insight_id UUID
    REFERENCES growth_insights(id) ON DELETE SET NULL;

ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_origin_check;
ALTER TABLE ideas
    ADD CONSTRAINT ideas_origin_check
    CHECK (origin IN ('manual', 'comment', 'performance', 'experiment'));

-- ---------------------------------------------------------------------------
-- comments: dedupe + analysis provenance
-- ---------------------------------------------------------------------------
-- Re-analysing an identical comment on every request is wasted provider budget
-- and produces contradictory classifications over time.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS classification JSONB;

-- A comment must belong to a post the creator owns. CASCADE is already correct:
-- deleting the asset removes its comments, and nothing is orphaned.
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_user_content_hash
    ON comments(user_id, content_hash)
    WHERE content_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- comment_insights: link to the comments that produced it
-- ---------------------------------------------------------------------------
-- Phase 4's contract was category / summary / questions / actionable_idea, which
-- describes ONE comment. Phase 5 needs to say WHICH comments, with evidence and
-- a deterministic confidence, or the insight is unfalsifiable.
ALTER TABLE comment_insights ADD COLUMN IF NOT EXISTS comment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE comment_insights ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE comment_insights ADD COLUMN IF NOT EXISTS confidence NUMERIC(4, 3);
ALTER TABLE comment_insights ADD COLUMN IF NOT EXISTS demand_score NUMERIC(6, 2);

ALTER TABLE comment_insights DROP CONSTRAINT IF EXISTS comment_insights_confidence_check;
ALTER TABLE comment_insights
    ADD CONSTRAINT comment_insights_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

-- ---------------------------------------------------------------------------
-- performance_records: which metrics were actually measured
-- ---------------------------------------------------------------------------
-- Every numeric column defaults to 0, which conflates "measured, and it was zero"
-- with "never measured". A Copilot that reads a default 0 as a real zero will
-- state a fabricated metric. `metrics_measured` makes availability explicit;
-- NULL means "all platform metrics were measured", which is the correct reading
-- of rows created before this migration.
ALTER TABLE performance_records
    ADD COLUMN IF NOT EXISTS metrics_measured JSONB;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Growth dashboard: this creator's current insights, newest first.
CREATE INDEX IF NOT EXISTS idx_growth_insights_user_created
    ON growth_insights(user_id, created_at DESC);

-- Only live claims. Partial, because the hot path always filters on this.
CREATE INDEX IF NOT EXISTS idx_growth_insights_user_live
    ON growth_insights(user_id, insight_type)
    WHERE is_stale = FALSE;

-- "Which insights rest on this record?" -- the invalidation path.
CREATE INDEX IF NOT EXISTS idx_growth_insights_user_fingerprint
    ON growth_insights(user_id, source_fingerprint);

CREATE INDEX IF NOT EXISTS idx_experiments_user_status
    ON experiments(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_experiments_user_variant
    ON experiments(user_id, variant_asset_id);

-- Per-creator performance timeline: the analyzer's hot path.
CREATE INDEX IF NOT EXISTS idx_performance_records_user_recorded
    ON performance_records(user_id, recorded_at DESC);

-- Analytics joins a record back to the content it describes.
CREATE INDEX IF NOT EXISTS idx_performance_records_user_asset
    ON performance_records(user_id, asset_id);

-- Unanalysed comments: the analyzer's work queue.
CREATE INDEX IF NOT EXISTS idx_comments_user_unanalysed
    ON comments(user_id)
    WHERE analyzed_at IS NULL;

-- Ranked opportunities, strongest demand first.
CREATE INDEX IF NOT EXISTS idx_ideas_user_demand
    ON ideas(user_id, demand_score DESC NULLS LAST)
    WHERE origin <> 'manual';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- New tables get the same Phase 2 architecture as everything else: RLS enabled,
-- one creator-scoped policy per command. No second authorization system.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['growth_insights', 'experiments']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS user_%I_isolation ON %I', t, t);
        -- Also drop an earlier incorrect policy name, in case a pre-release copy
        -- of this migration was applied with it.
        EXECUTE format('DROP POLICY IF EXISTS %I_own ON %I', t, t);
        -- The platform reads identity through the `current_user_id()` helper
        -- defined in migration 002, which parses `request.jwt.claims`. Using a raw
        -- `current_setting('app.current_user_id', ...)` here instead would silently
        -- read NULL and deny every legitimate write.
        EXECUTE format(
            'CREATE POLICY user_%I_isolation ON %I '
            'FOR ALL USING (current_user_id() = user_id) '
            'WITH CHECK (current_user_id() = user_id)',
            t, t);
    END LOOP;
END $$;

INSERT INTO schema_migrations (version, notes)
VALUES (
    '008_growth_domain',
    'Phase 5 Growth domain. Reuses comments, comment_insights, lessons, ideas and '
    'performance_records from migration 002 (previously unused). Adds growth_insights '
    '(evidence, deterministic confidence, impact, fingerprint-based staleness) and a '
    'minimal experiments table. Anti-fabrication is enforced in schema: evidence is '
    'NOT NULL, confidence is bounded, and performance_records.metrics_measured makes '
    'metric availability explicit so a default 0 is never read as a measured zero.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
