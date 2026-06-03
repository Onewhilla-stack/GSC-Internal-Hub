---
name: Multi-service job edit contract
description: How a job toggles between single-service and multi-service on PATCH /jobs/:id, and the items:null collapse signal.
---

A job (visit) is either single-service (`serviceType` + `amount`, `items` is null) or
multi-service (`items` array; total `amount` and the `serviceType` label "Multiple Services"
derived from the items). `resolveJobServices` collapses a 1-item array to that item's own
serviceType label.

**The `items: null` collapse signal:** On PATCH, three distinct cases must be kept separate:
- `items` is an array → derive total/label from it (multi).
- `items` omitted (`undefined`) → do NOT touch items; if the row already has stored items,
  recompute total/label from them (prevents an amount-only edit from desyncing row.amount vs
  the items breakdown).
- `items` is explicit `null` → CLEAR stored items and fall back to supplied serviceType/amount
  (this is how the UI collapses a multi-service job back to single).

**Why:** without the explicit `null`, a multi→single conversion sent only serviceType/amount,
which hit the "omitted → keep stored items" branch and silently ignored the collapse.

**Receipts differ:** a receipt ALWAYS stores an items array (create sets items even for one
service), so there is no items:null collapse signal. PATCH /receipts recomputes total + the
"Multiple Services" label whenever `items` is supplied; "collapse to single" is just a one-item
array. The edit UI mirrors the job convert/collapse UX but always sends `items`. Editing a
receipt's services is director-only (guarded inside the handler by `req.session.role`), while
status/notes-only edits stay open to workers.

**Job↔receipt sync:** receipts link to a job via `jobId`. PATCH /jobs accepts a `syncReceipts`
flag; when true, every receipt with that jobId is rewritten to mirror the job's resolved
services (items, total, "Multiple Services"/single label) the same way receipt-create derives
them (single-service job → one-item list). Jobs page only sends the flag when a linked receipt
exists (it loads all receipts to detect this) and the director leaves the offer checked. The
receipt edit dialog fetches the source job and shows a drift banner + "Pull latest from job"
when services no longer match. Sync is one-directional (job→receipt); editing a receipt does NOT
push back to the job, so they can still diverge — hence the banner.

**How to apply:** the OpenAPI `JobUpdate.items` is `type: ["array","null"]` so the generated
zod accepts null. Frontend edit dialog (`artifacts/gsc-app/src/pages/jobs.tsx`) sends
`items: null` when collapsing; multi mode is driven by `editItems.length > 0`. Wages are always
`teamMembers × rate` (charged once) regardless of item count — never per item.
