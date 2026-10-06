-- Migration 007: Today plan state (Phase 4).
--
-- Phase 4 needs a durable, per-day plan with real state transitions and a
-- Studio handoff. The obvious move would be a new `today_plan_items` table.
-- `plan_items` already exists for exactly this and is BETTER reused than
-- duplicated: it already has user_id, plan_date, idea_id, title, platform,
-- priority, estimated_minutes and RLS. It has 0 rows and no application code
-- referencing it (verified), so extending it is safe.
--
-- Deliberately NOT created:
--   - `today_plans`      -- a day is just `plan_items.plan_date`; a table would be
--                           a second source of truth for "which days exist".
--   - `producer_runs`    -- a producer run is a job; `jobs` already records type,
--                           status, progress, error and metadata, and JobService
--                           already implements claim/retry/cancel. A parallel run
--                           table would duplicate observability (task §25).
--   - `producer_recommendations` -- a recommendation becomes a `plan_items` row.
--                           Persisting it separately would create two rows that
--                           could disagree about whether work was accepted.
--
-- What is added here is state and provenance, all of it things a plan item cannot
-- express today.

BEGIN;

-- ---------------------------------------------------------------------------
-- plan_items: real state machine
-- ---------------------------------------------------------------------------
-- `completed BOOLEAN` cannot express "in progress", "skipped" or "blocked", and a
-- Today surface has to show the difference between "I decided not to" and "I
-- couldn't". `status` supersedes it; `completed` is retained and maintained as a
-- derived convenience so anything already reading it stays correct.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'plan_items' AND column_name = 'status'
    ) THEN
        ALTER TABLE plan_items ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'planned';
    END IF;
END $$;

ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_status_check;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_status_check
    CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped', 'blocked'));

-- Backfill: existing rows predate `status`, so derive it from `completed`.
UPDATE plan_items
SET status = CASE WHEN completed THEN 'completed' ELSE 'planned' END
WHERE status = 'planned' AND completed;

-- ---------------------------------------------------------------------------
-- plan_items: why, what kind, and where it came from
-- ---------------------------------------------------------------------------

-- "Why should I do it?" Adapted from Module 04's PlanItem.note, but as a
-- first-class column rather than prose buried in a template.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS reason TEXT;

-- Whether the reason is an observed creator fact or the Producer's judgement.
-- Adapted from Module 21's `fabricatedStatisticValidator`: a claim is only
-- presented as a fact when it is marked OBSERVED and has evidence.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS reason_kind VARCHAR(20);
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_reason_kind_check;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_reason_kind_check
    CHECK (reason_kind IS NULL OR reason_kind IN ('observed', 'suggestion'));

-- What the creator is being asked to DO. The vocabulary follows the 3-slot day
-- decomposition adapted from Module 04 (`main` / `quick` / `trust`), extended
-- with the continuation and refinement states a Studio session naturally has.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS action_kind VARCHAR(30);

-- The constraint must be added AFTER the column exists; PostgreSQL resolves
-- CHECK expressions at creation time.
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_action_kind_check;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_action_kind_check
    CHECK (action_kind IS NULL OR action_kind IN (
        'create_content',   -- main slot: produce something new
        'quick_engage',     -- quick slot: low-effort engagement
        'build_trust',      -- trust slot: depth over volume
        'continue_draft',   -- resume unfinished Studio work
        'refine_content',   -- iterate on an existing version
        'repurpose',        -- adapt existing content to another platform
        'review_idea',      -- triage an idea before making it
        'publish_prep'      -- prepare a publish-ready asset
    ));

-- Which Studio capability should execute it. NULL for items the creator manages
-- by hand; the Producer never invents a capability that the Studio registry does
-- not contain (enforced in the application layer, tested).
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS capability VARCHAR(60);

-- Ordering within the day. Module 04 sorted by slot; `rank` is the deterministic
-- order the Producer computed.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS rank INTEGER NOT NULL DEFAULT 0;

-- Duplicate prevention. The Producer must not re-add work it already planned
-- today; a unique key makes that a database guarantee, not a code convention.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(200);

-- Studio handoff. A Producer item that has been accepted points at the Studio
-- session doing the work, so Today can show real progress rather than guessing.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS studio_session_id UUID;
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_studio_session_fkey;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_studio_session_fkey
    FOREIGN KEY (studio_session_id) REFERENCES studio_sessions(id) ON DELETE SET NULL;

-- Which Studio version the work landed in, once it exists.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS generation_id UUID;

-- 'producer' | 'creator' -- who decided this item exists. A creator-added item is
-- never overwritten or removed by the Producer.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'creator';
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_source_check;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_source_check CHECK (source IN ('producer', 'creator'));

-- The Producer's structured recommendation that produced this item, kept as
-- evidence. Recommendations are re-derived on each planning run, so this is a
-- snapshot of the reasoning at the time the item was created -- not a live link
-- to a separate table that could later disagree.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS recommendation JSONB;

-- Priority is now a band with meaning, not an opaque integer. Module 04's
-- vocabulary (high/medium/low) is reused.
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS priority_band VARCHAR(10);
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_priority_band_check;
ALTER TABLE plan_items
    ADD CONSTRAINT plan_items_priority_band_check
    CHECK (priority_band IS NULL OR priority_band IN ('high', 'medium', 'low'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Today's plan for one creator: the hot path.
CREATE INDEX IF NOT EXISTS idx_plan_items_user_date_status
    ON plan_items(user_id, plan_date, status);

-- Dedupe guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_items_user_date_dedupe
    ON plan_items(user_id, plan_date, dedupe_key)
    WHERE dedupe_key IS NOT NULL;

-- Producer reverse lookup: what did I plan today from this reasoning?
CREATE INDEX IF NOT EXISTS idx_plan_items_user_action_kind
    ON plan_items(user_id, action_kind);

-- Keep `completed` consistent with `status` without trusting every writer.
CREATE OR REPLACE FUNCTION sync_plan_item_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.completed := (NEW.status = 'completed');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS plan_items_sync_completed ON plan_items;
CREATE TRIGGER plan_items_sync_completed
    BEFORE UPDATE ON plan_items
    FOR EACH ROW EXECUTE FUNCTION sync_plan_item_completed();

INSERT INTO schema_migrations (version, notes)
VALUES (
    '007_today_plan',
    'Extends the existing (empty, unreferenced) plan_items table into the Today plan: '
    'status state machine, action_kind from Module 04''s 3-slot day decomposition, '
    'Studio handoff, dedupe guarantee, and recommendation evidence. Adds no new '
    'table: producer runs use jobs, and a day is just a plan_date.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
