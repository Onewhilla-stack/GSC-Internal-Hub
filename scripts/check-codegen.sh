#!/bin/bash
# Guard against stale generated API code.
#
# Regenerates the Zod schemas and React Query hooks from the OpenAPI spec
# (lib/api-spec/openapi.yaml) and fails if the committed output differs from
# what the spec produces. This catches the "mystery build break" where the
# spec/server are correct but the generated libs are out of date.
#
# Uses a file lock so multiple validation checks can run concurrently without
# racing on the shared generated directories.
set -euo pipefail

LOCK_FILE=/tmp/codegen-check.lock

run_check() {
  # Directories that are fully owned by codegen.
  GENERATED_DIRS=(
    "lib/api-zod/src/generated"
    "lib/api-client-react/src/generated"
  )

  echo "==> Regenerating API code from lib/api-spec/openapi.yaml ..."
  pnpm --filter @workspace/api-spec run codegen

  echo "==> Checking whether generated output is in sync with the spec ..."
  DIRTY="$(git status --porcelain -- "${GENERATED_DIRS[@]}")"

  if [ -n "$DIRTY" ]; then
    echo ""
    echo "ERROR: Generated API code is out of date with lib/api-spec/openapi.yaml." >&2
    echo "The following generated files differ from the committed versions:" >&2
    echo "" >&2
    echo "$DIRTY" >&2
    echo "" >&2
    echo "Fix: run 'pnpm --filter @workspace/api-spec run codegen' and commit the result." >&2
    echo "" >&2
    echo "----- diff -----" >&2
    git --no-pager diff -- "${GENERATED_DIRS[@]}" >&2 || true
    exit 1
  fi

  echo "OK: Generated API code is in sync with the spec."
}

(
  flock -x 200
  run_check
) 200>"$LOCK_FILE"
