---
name: Role system & users
description: 3-user role system with director/worker access control throughout the app
---

## Users
- director1 / gsc2026 → role: director
- director2 / gsc2026 → role: director  
- worker / gsc0000 → role: worker

## How role flows
- Stored in `users.role` column (text)
- Stored in session on login (`req.session.role`)
- Returned by `GET /auth/me` alongside `id` and `username`
- `AuthContext` (`auth.tsx`) exposes `isDirector` and `isWorker` booleans
- `requireDirector` middleware in `artifacts/api-server/src/middlewares/requireDirector.ts` returns 403 if `req.session.role !== "director"`

## Director-only routes (backend)
- `GET /expenses`, `POST /expenses`, `PATCH /expenses/:id`, `DELETE /expenses/:id`
- `PATCH /jobs/:id`, `DELETE /jobs/:id`
- `PATCH /clients/:id`, `DELETE /clients/:id`
- `GET /audit-log`
- Analytics and Settings pages (frontend redirect only)

## Worker permissions
- Can log new jobs (`POST /jobs`)
- Can view jobs, clients, receipts
- Cannot see financial figures in the Jobs table
- Dashboard shows "My Jobs" with job entry form instead of revenue charts

**Why:** Business decision — workers should be able to log work but not see financials or modify/delete records.
