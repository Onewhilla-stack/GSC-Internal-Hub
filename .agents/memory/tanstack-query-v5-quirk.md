---
name: TanStack Query v5 inline options
description: UseQueryOptions requires queryKey when passed inline to generated hooks
---

## The quirk
In TanStack Query v5, `UseQueryOptions` has `queryKey` as required. When passing inline `query: { ... }` options to generated Orval hooks, you must also include the `queryKey`.

## Pattern that fails
```tsx
useGetMe({ query: { retry: false } }); // TS error: queryKey missing
```

## Correct pattern
```tsx
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
```

**Why:** TanStack Query v5 changed `queryKey` from optional to required in `UseQueryOptions`. Every generated hook has a matching `get*QueryKey()` function exported alongside it.

**How to apply:** Any time you pass a `query: { ... }` object inline to a generated hook, also import and add the corresponding `get*QueryKey()` result.
