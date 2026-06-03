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

**How to apply:** the OpenAPI `JobUpdate.items` is `type: ["array","null"]` so the generated
zod accepts null. Frontend edit dialog (`artifacts/gsc-app/src/pages/jobs.tsx`) sends
`items: null` when collapsing; multi mode is driven by `editItems.length > 0`. Wages are always
`teamMembers × rate` (charged once) regardless of item count — never per item.
