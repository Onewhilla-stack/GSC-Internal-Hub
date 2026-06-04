#!/bin/bash
# Guard against Drizzle schema drift.
#
# Compares the TypeScript schema in lib/db/src/schema/ against the committed
# migrations snapshot in lib/db/migrations/. If the schema has changed without
# a corresponding 'drizzle-kit generate' + commit, this script exits non-zero
# with a clear message.
#
# How it works:
#   1. Copies the committed migrations snapshot to a temp directory under the
#      repo root (so relative paths in the drizzle config work correctly).
#   2. Writes a temporary drizzle config pointing to that temp directory.
#   3. Runs 'drizzle-kit generate' — no new SQL means the schema is in sync.
#   4. If a new SQL migration file was produced, the schema has drifted.
#
# No DATABASE_URL is needed — 'generate' only reads TypeScript schema files.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/lib/db/migrations"
SCHEMA_PATH="$REPO_ROOT/lib/db/src/schema/index.ts"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: $MIGRATIONS_DIR not found." >&2
  echo "Run 'pnpm --filter @workspace/db exec drizzle-kit generate --name init' to create the baseline snapshot." >&2
  exit 1
fi

# Create temp dir inside the repo root so drizzle-kit can resolve it via
# relative paths (drizzle-kit prepends './' to config paths, breaking
# absolute /tmp paths).
TMPDIR_CHECK="$(mktemp -d "$REPO_ROOT/.drift-check-XXXXXX")"
trap 'rm -rf "$TMPDIR_CHECK"' EXIT

echo "==> Copying committed migrations snapshot to temp dir ..."
mkdir -p "$TMPDIR_CHECK/migrations"
cp -r "$MIGRATIONS_DIR/." "$TMPDIR_CHECK/migrations/"

# Count existing SQL files in the snapshot
BEFORE=$(find "$TMPDIR_CHECK/migrations" -maxdepth 1 -name "*.sql" | wc -l)

# Relative path from lib/db/ to the temp migrations dir.
# TMPDIR_CHECK is at repo root level, lib/db/ is two levels deep, so:
#   ../../<dirname>/migrations
TMPDIR_BASENAME="$(basename "$TMPDIR_CHECK")"
OUT_REL="../../${TMPDIR_BASENAME}/migrations"

# Write a minimal JS config using a relative out path.
CONFIG_FILE="$TMPDIR_CHECK/drizzle.config.cjs"
cat > "$CONFIG_FILE" << EOF
/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: "$SCHEMA_PATH",
  dialect: "postgresql",
  out: "$OUT_REL",
  dbCredentials: { url: "postgresql://localhost/placeholder_for_generate_only" },
};
EOF

CONFIG_ABS="$CONFIG_FILE"
# Path to config relative to lib/db/ (where pnpm filter exec runs)
CONFIG_REL="../../${TMPDIR_BASENAME}/drizzle.config.cjs"

echo "==> Running drizzle-kit generate against snapshot to detect drift ..."
if ! pnpm --filter @workspace/db exec drizzle-kit generate \
  --config "$CONFIG_REL" \
  --name drift_check 2>&1; then
  echo "" >&2
  echo "ERROR: drizzle-kit generate failed — see output above." >&2
  exit 1
fi

# Count SQL files after
AFTER=$(find "$TMPDIR_CHECK/migrations" -maxdepth 1 -name "*.sql" | wc -l)

if [ "$AFTER" -gt "$BEFORE" ]; then
  NEW_FILE=$(find "$TMPDIR_CHECK/migrations" -maxdepth 1 -name "*drift_check*" | head -1)
  echo "" >&2
  echo "ERROR: Drizzle schema has drifted from the committed migrations snapshot." >&2
  echo "" >&2
  echo "The following SQL changes are pending (not yet generated + committed):" >&2
  echo "" >&2
  if [ -n "$NEW_FILE" ]; then
    cat "$NEW_FILE" >&2
  fi
  echo "" >&2
  echo "Fix: run these two commands and commit the result:" >&2
  echo "  pnpm --filter @workspace/db exec drizzle-kit generate" >&2
  echo "  pnpm --filter @workspace/db run push" >&2
  echo "" >&2
  exit 1
fi

echo "OK: Drizzle schema is in sync with the committed migrations snapshot."
