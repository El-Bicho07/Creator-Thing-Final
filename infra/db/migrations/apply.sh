#!/usr/bin/env bash
# Apply versioned SQL migrations to an already-initialised database.
#
# ADR-005 selects versioned SQL files, but `docker-entrypoint-initdb.d` only runs
# on FIRST initialisation of an empty Postgres data directory. Because the volume
# already exists in development, migrations numbered above the initial schema must
# be applied explicitly. This script does that, in filename order, and records
# each application in `schema_migrations` so re-running is safe.
#
# Usage:  infra/db/migrations/apply.sh [database] [container]
set -euo pipefail

DB="${1:-creator_platform}"
CONTAINER="${2:-creator-postgres}"
DB_USER="${DB_USER:-creator}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Applying migrations from $DIR to '$DB' (container: $CONTAINER)"

# 000/001/002 are the initial schema, already applied by docker-entrypoint-initdb.d.
for file in "$DIR"/*.sql; do
    version="$(basename "$file" .sql)"
    case "$version" in
        000_*|001_*|002_*) continue ;;
    esac

    already="$(
        docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB" -tAc \
            "SELECT 1 FROM schema_migrations WHERE version = '${version}'" 2>/dev/null || true
    )"

    # Skip anything already recorded. This applies to EVERY migration including
    # the contract step: 004 is deliberately not idempotent (its guard aborts once
    # embedding_v2 is gone), so re-running it must not be attempted.
    if [ "$already" = "1" ]; then
        echo "  = $version (already applied, skipping)"
        continue
    fi

    echo "  + $version"
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB" \
        < "$file" > /dev/null

    # Migrations record themselves in schema_migrations inside the same
    # transaction, so reaching here means it committed.
    echo "  . recorded $version"
done

echo "Done. Applied state:"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB" -tAc \
    "SELECT version || ' @ ' || applied_at FROM schema_migrations ORDER BY version" \
    2>/dev/null || echo "  (schema_migrations not present yet)"