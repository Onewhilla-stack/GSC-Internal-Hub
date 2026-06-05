---
name: Startup migrations pattern
description: How to apply DB schema changes that Drizzle-kit push can't run non-interactively in CI/deploy
---

## Rule
Any new column/table added to the Drizzle schema must ALSO be added to
`artifacts/api-server/src/lib/startup-migrations.ts` using an
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statement.

**Why:** `drizzle-kit push` requires an interactive TTY and fails in CI
(the post-merge setup script) and in production deploys. The API server
does not auto-migrate on boot. So committed migration files alone do not
update the live DB — the column must be applied explicitly on startup.

**How to apply:** Add one `client.query(ALTER TABLE ... IF NOT EXISTS)` call
per new column in `runStartupMigrations()`. The IF NOT EXISTS guard makes
it idempotent and safe to run on every boot against dev and production.
Without this, any code that SELECTs or UPDATEs the new column will 500 in
production even though the schema snapshot and generated code are correct.
