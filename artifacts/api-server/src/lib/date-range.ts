const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Regex shape alone accepts impossible dates (2026-02-31) / months (2026-13).
// Round-trip through Date to confirm the calendar value is real.
function isRealDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
function isRealMonth(s: string): boolean {
  const [, m] = s.split("-").map(Number);
  return m >= 1 && m <= 12;
}

export type RangeQuery = { from?: string; to?: string; month?: string };

export type ResolvedRange = { start: string; end: string; prevStart: string; prevEnd: string };

export type RangeResult = { ok: true; range: ResolvedRange } | { ok: false; error: string };

// Compute a date range (end exclusive) plus the equal-length immediately
// preceding range for "vs previous period" comparisons.
// Priority: from+to (inclusive) → month (YYYY-MM) → current month.
export function computeRange(from?: string, to?: string, monthStr?: string): ResolvedRange {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (from && to) {
    start = new Date(`${from}T00:00:00`);
    end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1); // make 'to' inclusive
  } else {
    const year = monthStr ? parseInt(monthStr.split("-")[0]) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr.split("-")[1]) - 1 : now.getMonth();
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 1);
  }

  const lengthMs = end.getTime() - start.getTime();
  return {
    start: fmt(start),
    end: fmt(end),
    prevEnd: fmt(new Date(start.getTime())),
    prevStart: fmt(new Date(start.getTime() - lengthMs)),
  };
}

// Validate raw query params, then resolve. Returns an error result (let the
// caller send a 400) when inputs are malformed or inverted.
export function resolveDateRange(query: RangeQuery): RangeResult {
  const { from, to, month } = query;

  if (from || to) {
    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return { ok: false, error: "'from' and 'to' must both be provided in YYYY-MM-DD format" };
    }
    if (!isRealDate(from) || !isRealDate(to)) {
      return { ok: false, error: "'from' and 'to' must be valid calendar dates" };
    }
    if (from > to) {
      return { ok: false, error: "'from' must not be after 'to'" };
    }
  }
  if (month && (!MONTH_RE.test(month) || !isRealMonth(month))) {
    return { ok: false, error: "'month' must be in YYYY-MM format" };
  }

  return { ok: true, range: computeRange(from, to, month) };
}
