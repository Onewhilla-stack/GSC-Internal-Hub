---
name: wouter query params
description: How to read URL query strings in this wouter v3 SPA (prefill, deep links).
---

# Reading query params with wouter

`useLocation()` returns only the **pathname** (e.g. `/receipts`), never the `?query`.
To read the query string, use wouter's `useSearch()` (returns the string without the
leading `?`) and feed it into `new URLSearchParams(...)`. `useSearchParams()` is also available.

**Why:** A receipt-prefill feature silently never worked because it did
`useLocation()[0].split("?")[1]` — that's always empty, so no params were ever parsed.

**How to apply:** Any time a page prefills a form or reacts to deep-link params,
read them via `useSearch()`. Note `useForm` defaultValues are computed at mount only —
this is fine when navigating in from another route (page remounts), but if params can
change while already on the same route, add a `useEffect` keyed on the search string to
`form.reset(...)`.
