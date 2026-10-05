-- Migration 003 (EXPAND phase): prepare chunks for the 384 -> 768 embedding migration.
--
-- Selected model (ADR-002, Phase 2): intfloat/multilingual-e5-base, 768 dimensions.
--
-- WHY EXPAND/CONTRACT INSTEAD OF ALTER COLUMN
--   `ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(768)` would either fail
--   on existing rows or force us to pad/truncate 384-d vectors into 768. Both are
--   unacceptable: a padded vector is not an E5 embedding, it is a lie, and cosine
--   ranking against mixed spaces is silently wrong.
--
--   So this migration only ADDS capacity and provenance. Existing data keeps its
--   384-d vector untouched and readable. Migration 004 performs the cutover only
--   after every row has been re-embedded with real E5 vectors and validated.
--
-- OPERATIONAL NOTE (ADR-005)
--   `docker-entrypoint-initdb.d` only executes on FIRST initialisation of an empty
--   data directory. Because the postgres volume already exists, this file will NOT
--   run automatically. It must be applied explicitly:
--       docker exec -i creator-postgres psql -U creator -d creator_platform \
--           < infra/db/migrations/003_embedding_768_expand.sql
--   `infra/db/migrations/apply.sh` does this and records applied migrations in
--   schema_migrations.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Embedding provenance
--
-- Without these columns there is no way to prove a stored vector came from E5
-- rather than from an old 384-d model, which is exactly what Phase 2 validation
-- must be able to assert.
-- ---------------------------------------------------------------------------
ALTER TABLE chunks
    ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(150),
    ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER,
    ADD COLUMN IF NOT EXISTS embedding_version VARCHAR(50),
    ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMPTZ;

COMMENT ON COLUMN chunks.embedding_model IS
    'Model that produced this vector, e.g. intfloat/multilingual-e5-base';
COMMENT ON COLUMN chunks.embedding_dimension IS
    'Dimensionality of this vector. Must equal embedding column width.';
COMMENT ON COLUMN chunks.embedding_version IS
    'Embedding pipeline version, e.g. e5-base-v1';
COMMENT ON COLUMN chunks.embedding_created_at IS
    'When this vector was generated (re-embedding audit trail)';

-- ---------------------------------------------------------------------------
-- 1b. Relax NOT NULL on the legacy 384-d column
--
-- The old column is `NOT NULL`, which makes the expand phase impossible: a new
-- chunk cannot be inserted until it has a 384-d vector, and we can no longer
-- produce a legitimate one because the old model is out of Phase 2 scope.
-- Producing a fake 384-d vector (padding/truncating an E5 vector) is exactly the
-- corruption this migration exists to avoid.
--
-- So the legacy column becomes nullable during the expand window. Migration 004
-- promotes the 768-d column to `embedding` and restores NOT NULL there.
-- ---------------------------------------------------------------------------
ALTER TABLE chunks ALTER COLUMN embedding DROP NOT NULL;

COMMENT ON COLUMN chunks.embedding IS
    'Legacy 384-d vector. Nullable during the 384->768 migration window; '
    'dropped by migration 004.';

-- ---------------------------------------------------------------------------
-- 2. New 768-d column (expand)
--
-- Nullable on purpose: rows not yet re-embedded must remain valid, so the
-- migration can be applied without downtime and re-embedding can run separately.
-- ---------------------------------------------------------------------------
ALTER TABLE chunks
    ADD COLUMN IF NOT EXISTS embedding_v2 vector(768);

COMMENT ON COLUMN chunks.embedding_v2 IS
    'E5-base 768-d vector. NULL until re-embedded; promoted to `embedding` by migration 004.';

-- ---------------------------------------------------------------------------
-- 3. Guard: dimension must agree with provenance.
--
-- Makes it impossible to record, say, 768 next to a non-768 vector. Runs on
-- INSERT/UPDATE from application code after migration 004, and immediately when
-- backfilling.
-- ---------------------------------------------------------------------------
ALTER TABLE chunks DROP CONSTRAINT IF EXISTS chunks_embedding_provenance_chk;
ALTER TABLE chunks ADD CONSTRAINT chunks_embedding_provenance_chk CHECK (
    (embedding_v2 IS NULL)
    OR (embedding_dimension = 768)
);

ALTER TABLE chunks DROP CONSTRAINT IF EXISTS chunks_embedding_model_chk;
ALTER TABLE chunks ADD CONSTRAINT chunks_embedding_model_chk CHECK (
    (embedding_v2 IS NULL)
    OR (embedding_model = 'intfloat/multilingual-e5-base')
);

-- ---------------------------------------------------------------------------
-- 4. Partial index on the NEW column only.
--
-- The old ivfflat index (idx_chunks_embedding, 384-d) is intentionally LEFT IN
-- PLACE: during the expand window the old column is still authoritative and must
-- stay indexed. Migration 004 drops it.
--
-- ivfflat needs data to build a useful partition list, so the index is created
-- after backfill by migration 004 rather than here.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. Migration bookkeeping (ADR-005 noted the absence of state tracking; add it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(100) PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum    VARCHAR(64),
    notes       TEXT
);

COMMENT ON TABLE schema_migrations IS
    'Applied migration versions. docker-entrypoint-initdb.d does not re-run on an '
    'existing volume, so migrations after the initial schema are applied explicitly.';

INSERT INTO schema_migrations (version, notes)
VALUES (
    '003_embedding_768_expand',
    'Expand phase: added chunks.embedding_v2 vector(768) plus embedding provenance columns. Non-destructive.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;