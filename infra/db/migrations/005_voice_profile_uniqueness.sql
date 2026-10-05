-- Migration 005: allow several named voice profiles per creator.
--
-- Phase 2 needed a stable upsert target for the Voice Engine. A UNIQUE
-- constraint on user_id alone would restrict a creator to exactly one voice,
-- which is wrong for a multilingual platform (a creator may keep, say, an
-- English primary style and a Tamil explainer style).
--
-- So uniqueness is scoped to (user_id, style_name): a creator has many named
-- profiles, and re-saving the same name updates in place. The "canonical"
-- profile is style_name = 'Primary Style'.

BEGIN;

-- Fail loudly rather than silently merging profiles if duplicates already exist.
DO $$
DECLARE
    v_dupes BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_dupes FROM (
        SELECT user_id, style_name FROM voice_profiles
        GROUP BY user_id, style_name HAVING COUNT(*) > 1
    ) duplicates;
    IF v_dupes > 0 THEN
        RAISE EXCEPTION
            'migration 005 aborted: % duplicate (user_id, style_name) pairs exist. '
            'Merge them before applying.', v_dupes;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_profiles_user_style
    ON voice_profiles(user_id, style_name);

INSERT INTO schema_migrations (version, notes)
VALUES (
    '005_voice_profile_uniqueness',
    'Unique (user_id, style_name) on voice_profiles, giving the Voice Engine a stable '
    'upsert target while allowing multiple named profiles per creator.'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
