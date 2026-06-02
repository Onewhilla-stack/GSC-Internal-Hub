---
name: Session table setup
description: connect-pg-simple session table must be created manually in this project; the auto-create option breaks under esbuild bundling.
---

When the API server is bundled with esbuild, `connect-pg-simple`'s `createTableIfMissing: true` option throws `ENOENT: no such file or directory, open '.../dist/table.sql'` because the package's SQL asset file is not included in the bundle.

**Why:** esbuild only bundles JS/TS files by default; non-JS assets (like `.sql`) are not copied to `dist/`.

**How to apply:**
1. Remove `createTableIfMissing: true` from the `PgSession` config in `app.ts`.
2. Create the session table manually via SQL (once, on DB setup):
```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```
This table already exists in the project's PostgreSQL DB.
