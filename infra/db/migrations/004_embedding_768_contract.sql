-- Migration 004 (CONTRACT phase): cut over to the 768-d E5 embedding.
--
-- Run ONLY after:
--   * migration 003 has been applied, and
--   * `python -m app.memory.reembed` has re-embedded every chunk with genuine
--     intfloat/multilingual-e5-base output, and
--   * `python -m app.memory.reembed --verify` reports
--     unembedded = 0, wrong_dimension = 0, wrong_model = 0.
--
-- This migration is deliberately FAIL-CLOSED. Every guard below raises an
-- exception and aborts the transaction rather than performing a partial or
-- lossy cutover. A migration that "succeeds with warnings" is how mixed vector
-- spaces reach production.
--
-- Resulting representation: ONE authoritative `embedding vector(768)` column
-- with provenance. No duplicate vectors are left behind.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Guards -- abort unless the new column is complete and authentic
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_total        BIGINT;
    v_unembedded   BIGINT;
    v_wrong_dim    BIGINT;
    v_wrong_model  BIGINT;
    v_observed_dim BIGINT;
BEGIN
    -- Check the COLUMN, not a relation: `to_regclass('chunks.embedding_v2')`
    -- would parse `chunks` as a schema name and always return NULL, making this
    -- guard fire unconditionally.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chunks'
          AND column_name = 'embedding_v2'
    ) THEN
        RAISE EXCEPTION
            'migration 004 aborted: chunks.embedding_v2 does not exist. Apply migration 003 first.';
    END IF;

    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE embedding_v2 IS NULL),
           COUNT(*) FILTER (WHERE embedding_v2 IS NOT NULL
                              AND embedding_dimension IS DISTINCT FROM 768),
           COUNT(*) FILTER (WHERE embedding_v2 IS NOT NULL
                              AND embedding_model IS DISTINCT FROM 'intfloat/multilingual-e5-base')
      INTO v_total, v_unembedded, v_wrong_dim, v_wrong_model
      FROM chunks;

    IF v_unembedded > 0 THEN
        RAISE EXCEPTION
            'migration 004 aborted: % of % chunks have no E5 vector. Run app.memory.reembed first.',
            v_unembedded, v_total;
    END IF;

    IF v_wrong_dim > 0 THEN
        RAISE EXCEPTION
            'migration 004 aborted: % chunks record a dimension other than 768.', v_wrong_dim;
    END IF;

    IF v_wrong_model > 0 THEN
        RAISE EXCEPTION
            'migration 004 aborted: % chunks were not produced by intfloat/multilingual-e5-base.',
            v_wrong_model;
    END IF;

    -- Confirm the vectors really are 768-dimensional, not merely labelled 768.
    SELECT COALESCE(MAX(vector_dims(embedding_v2)), 0) INTO v_observed_dim FROM chunks;
    IF v_observed_dim <> 768 THEN
        RAISE EXCEPTION
            'migration 004 aborted: observed vector width is %, expected 768.', v_observed_dim;
    END IF;

    RAISE NOTICE 'Guard passed: % chunks, all 768-d, all E5-base.', v_total;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Drop the legacy ivfflat index (384-d) before dropping its column
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_chunks_embedding;

-- ---------------------------------------------------------------------------
-- 3. Promote the new column and drop the legacy one
-- ---------------------------------------------------------------------------
ALTER TABLE chunks DROP COLUMN embedding;
ALTER TABLE chunks RENAME COLUMN embedding_v2 TO embedding;

COMMENT ON COLUMN chunks.embedding IS
    'L2-normalised 768-d vector from intfloat/multilingual-e5-base '
    '(queries prefixed "query: ", documents prefixed "passage: "). '
    'See embedding_model / embedding_dimension / embedding_version for provenance.';

-- Restore NOT NULL now that every row has a real vector.
ALTER TABLE chunks ALTER COLUMN embedding SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Rebuild the vector index at the new dimensionality
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
    ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- 5. Post-cutover invariants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_dupes BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_dupes FROM chunks WHERE embedding IS NULL;
    IF v_dupes > 0 THEN
        RAISE EXCEPTION 'migration 004 post-check failed: % NULL embeddings remain.', v_dupes;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chunks' AND column_name = 'embedding_v2'
    ) THEN
        RAISE EXCEPTION 'migration 004 post-check failed: embedding_v2 still present.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chunks_embedding') THEN
        RAISE EXCEPTION 'migration 004 post-check failed: vector index missing.';
    END IF;

    RAISE NOTICE 'Post-check passed: single 768-d embedding column, index present.';
END $$;

INSERT INTO schema_migrations (version, notes)
VALUES (
    '004_embedding_768_contract',
    'Contract phase: dropped legacy vector(384), promoted embedding_v2 to embedding, '
    'SET NOT NULL, rebuilt ivfflat index. Guards abort on any incomplete or '
    'non-E5 vector.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;