---
name: Role system & users
description: 3-user role system with director/worker access control throughout the app
---

## Users (live in DB `users` table)
- deliction → role: director
- whilla → role: director
- worker → role: worker

Do not assume usernames — query `SELECT username, role FROM users` to confirm. Earlier notes said `director1`/`director2`; that was wrong. When seeding/importing historical data, set `created_by` to a real director username or NULL — never a phantom user.

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
