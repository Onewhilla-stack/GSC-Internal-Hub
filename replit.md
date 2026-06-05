# Gold Standard Cleaners (GSC)

Internal business management tool for a cleaning company in Nairobi, Kenya.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/gsc-app run dev` — run the frontend (Vite, port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm run codegen:check` — regenerate from the spec and fail if the committed generated output is stale (guards against "mystery build break" from out-of-date `lib/api-zod` / `lib/api-client-react`); also registered as the `codegen` validation check
- `pnpm run guards` — runs `schema:check` then `codegen:check` in sequence; single command to verify the project is fully in sync before deploying; also registered as the `guards` validation check
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm run schema:check` — detect schema drift (Drizzle schema vs committed snapshot); also registered as the `schema` validation check
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Frontend: React 18 + Vite + Wouter (routing) + TanStack Query + Recharts + shadcn/ui
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM table definitions (users, clients, jobs, expenses, receipts, settings)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/src/generated/` — generated Zod schemas from spec
- `lib/api-client-react/src/generated/` — generated React Query hooks from spec
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/gsc-app/src/pages/` — React page components

## Architecture decisions

- Contract-first API: OpenAPI spec → Zod schemas + React Query hooks via Orval codegen
- Sessions stored in PostgreSQL (`session` table) via connect-pg-simple — table was created manually (esbuild bundles don't include the package's `table.sql` asset)
- Numeric fields (amounts) stored as `numeric` strings in DB; routes cast to `parseFloat` before responding
- Wages auto-calculated: `wages = teamMembers × wagePerPersonPerDay` (from settings, default KES 1,000)
- `netIncome = amount - wages` stored on job creation/update

## Product

- **Login** — password-protected, single admin user (`admin` / `gsc2026`)
- **Dashboard** — monthly revenue, expenses, net income, top clients, recent jobs
- **Job Tracker** — log cleaning jobs with client, service type, team size, amount; auto-calculates wages and net income
- **Expense Tracker** — log business expenses by category; CSV import; monthly summary chart
- **Client Database** — client records with GSC-001 format codes, location, status
- **Receipt Generator** — generate and print receipts (GSC-RCT-001 format); a single receipt can itemize multiple services (line items), with the total auto-summed and `serviceType` shown as "Multiple Services" when more than one
- **Analytics** — month-over-month revenue and expense charts via Recharts
- **Settings** — configure wage rate per person per day, monthly rent

## User preferences

- Currency: KES (Kenyan Shillings)
- Brand colors: Sky Blue #29ABE2, Golden Yellow #F5C518, Black sidebar, white content

## Gotchas

- **connect-pg-simple session table** must exist in DB before starting the API server. The `session` table was created via raw SQL (the `createTableIfMissing` option can't find its `table.sql` asset when bundled by esbuild).
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change — the generated files in `lib/api-zod` and `lib/api-client-react` must stay in sync.
- Run `pnpm --filter @workspace/db exec drizzle-kit generate` after any schema change in `lib/db/src/schema/` — the migration snapshot in `lib/db/migrations/` must stay in sync (enforced by `pnpm run schema:check`). Then run `pnpm --filter @workspace/db run push` to apply it to the database.
- Run `pnpm run typecheck:libs` after schema changes in `lib/db` to rebuild the lib before dependent packages can use the new exports.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
