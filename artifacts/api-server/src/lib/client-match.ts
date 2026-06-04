/**
 * Pure helper for the client-link decision made when logging a visit.
 *
 * Encapsulates:
 *   - Name normalisation (trim + case-fold)
 *   - Empty-name guard → no link
 *   - Match detection against a candidate list
 *   - Phone-backfill rule (only when the existing record has no phone)
 */

export type ClientMatchDecision =
  | { kind: "skip" }
  | { kind: "match"; id: number; backfillPhone: string | null }
  | { kind: "create"; trimmedName: string; trimmedPhone: string | null };

export interface ClientCandidate {
  id: number;
  name: string;
  phone: string | null;
}

/**
 * Decide what to do with a client name/phone pair given a list of existing
 * client records.
 *
 * The caller is responsible for fetching candidates from the database.  For
 * production use, pass only the record(s) the DB already filtered via a
 * case-insensitive name comparison; for tests, pass any slice of the client
 * table to exercise the matching logic directly.
 *
 * Decision rules:
 *   1. Trim the name; if blank → { kind: "skip" }
 *   2. Find a candidate whose trimmed, lowercased name equals the normalised
 *      input name → { kind: "match", ... }
 *      - backfillPhone is set only when the input provides a phone AND the
 *        existing record has none.
 *   3. No match → { kind: "create", trimmedName, trimmedPhone }
 */
export function resolveClientMatch(
  name: string,
  phone: string | undefined,
  candidates: ClientCandidate[],
): ClientMatchDecision {
  const trimmedName = name.trim();
  if (!trimmedName) return { kind: "skip" };

  const trimmedPhone = phone?.trim() || null;

  const existing = candidates.find(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  if (existing) {
    return {
      kind: "match",
      id: existing.id,
      backfillPhone: trimmedPhone && !existing.phone ? trimmedPhone : null,
    };
  }

  return { kind: "create", trimmedName, trimmedPhone };
}
