import { describe, it, expect } from "vitest";
import { computeRange, resolveDateRange } from "./date-range";

// Helper: days in ms
const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeRange — explicit from/to", () => {
  it("sets start to from, end to to+1 day (inclusive 'to')", () => {
    const r = computeRange("2026-03-01", "2026-03-31");
    expect(r.start).toBe("2026-03-01");
    expect(r.end).toBe("2026-04-01");
  });

  it("computes prevEnd as start and prevStart as start minus the same length", () => {
    // Range: 2026-03-01 → 2026-03-31 = 31 days
    const r = computeRange("2026-03-01", "2026-03-31");
    expect(r.prevEnd).toBe("2026-03-01");
    expect(r.prevStart).toBe("2026-01-29"); // 31 days before 2026-03-01
  });

  it("handles a single-day range correctly", () => {
    // from=to=2026-04-15, length = 1 day
    const r = computeRange("2026-04-15", "2026-04-15");
    expect(r.start).toBe("2026-04-15");
    expect(r.end).toBe("2026-04-16");
    expect(r.prevEnd).toBe("2026-04-15");
    expect(r.prevStart).toBe("2026-04-14");
  });

  it("handles a multi-month from/to span", () => {
    // 2026-01-01 to 2026-03-31 = 89 days
    const start = new Date("2026-01-01T00:00:00");
    const endInclusive = new Date("2026-03-31T00:00:00");
    const endExclusive = new Date(endInclusive.getTime() + DAY_MS); // 2026-04-01
    const lengthMs = endExclusive.getTime() - start.getTime();
    const expectedPrevStart = new Date(start.getTime() - lengthMs);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const r = computeRange("2026-01-01", "2026-03-31");
    expect(r.start).toBe("2026-01-01");
    expect(r.end).toBe("2026-04-01");
    expect(r.prevEnd).toBe("2026-01-01");
    expect(r.prevStart).toBe(fmt(expectedPrevStart));
  });

  it("handles February correctly (crosses year boundary in prev period)", () => {
    // 2026-02-01 to 2026-02-28 = 28 days; prevStart = 2026-01-04
    const r = computeRange("2026-02-01", "2026-02-28");
    expect(r.start).toBe("2026-02-01");
    expect(r.end).toBe("2026-03-01");
    expect(r.prevEnd).toBe("2026-02-01");
    expect(r.prevStart).toBe("2026-01-04");
  });
});

describe("computeRange — month mode", () => {
  it("sets start to first of month and end to first of next month", () => {
    const r = computeRange(undefined, undefined, "2026-01");
    expect(r.start).toBe("2026-01-01");
    expect(r.end).toBe("2026-02-01");
  });

  it("prevEnd is start of month, prevStart is the same number of days earlier", () => {
    // January has 31 days; prev period = 31 days before 2026-01-01 = 2025-12-01
    const r = computeRange(undefined, undefined, "2026-01");
    expect(r.prevEnd).toBe("2026-01-01");
    expect(r.prevStart).toBe("2025-12-01");
  });

  it("handles February (28 days in 2026) — prevStart lands on Jan 4", () => {
    const r = computeRange(undefined, undefined, "2026-02");
    expect(r.start).toBe("2026-02-01");
    expect(r.end).toBe("2026-03-01");
    expect(r.prevEnd).toBe("2026-02-01");
    expect(r.prevStart).toBe("2026-01-04");
  });

  it("handles a leap-year February (2024 — 29 days)", () => {
    const r = computeRange(undefined, undefined, "2024-02");
    expect(r.start).toBe("2024-02-01");
    expect(r.end).toBe("2024-03-01");
    expect(r.prevEnd).toBe("2024-02-01");
    expect(r.prevStart).toBe("2024-01-03"); // 29 days before 2024-02-01
  });

  it("handles December — prev period falls in prior year", () => {
    const r = computeRange(undefined, undefined, "2025-12");
    expect(r.start).toBe("2025-12-01");
    expect(r.end).toBe("2026-01-01");
    expect(r.prevEnd).toBe("2025-12-01");
    expect(r.prevStart).toBe("2025-10-31"); // 31 days before 2025-12-01 = 2025-10-31
  });
});

describe("computeRange — default (no args)", () => {
  it("falls back to current month when no args provided", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextFmt = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

    const r = computeRange();
    expect(r.start).toBe(`${year}-${month}-01`);
    expect(r.end).toBe(nextFmt);
  });
});

describe("resolveDateRange — valid inputs", () => {
  it("returns ok:true with range for valid from+to", () => {
    const result = resolveDateRange({ from: "2026-03-01", to: "2026-03-31" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.range.start).toBe("2026-03-01");
      expect(result.range.end).toBe("2026-04-01");
    }
  });

  it("returns ok:true with range for valid month", () => {
    const result = resolveDateRange({ month: "2026-03" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.range.start).toBe("2026-03-01");
      expect(result.range.end).toBe("2026-04-01");
    }
  });

  it("returns ok:true and falls back to current month when query is empty", () => {
    const result = resolveDateRange({});
    expect(result.ok).toBe(true);
  });

  it("accepts same-day from+to (single-day range)", () => {
    const result = resolveDateRange({ from: "2026-06-01", to: "2026-06-01" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.range.start).toBe("2026-06-01");
      expect(result.range.end).toBe("2026-06-02");
    }
  });
});

describe("resolveDateRange — invalid inputs rejected", () => {
  it("rejects when only 'from' is provided (missing 'to')", () => {
    const result = resolveDateRange({ from: "2026-03-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/from.*to|to.*from/i);
  });

  it("rejects when only 'to' is provided (missing 'from')", () => {
    const result = resolveDateRange({ to: "2026-03-31" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/from.*to|to.*from/i);
  });

  it("rejects impossible date 2026-02-31", () => {
    const result = resolveDateRange({ from: "2026-02-01", to: "2026-02-31" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid calendar date/i);
  });

  it("rejects impossible date 2026-04-31 (April has 30 days)", () => {
    const result = resolveDateRange({ from: "2026-04-01", to: "2026-04-31" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid calendar date/i);
  });

  it("rejects malformed date string", () => {
    const result = resolveDateRange({ from: "2026-3-1", to: "2026-03-31" });
    expect(result.ok).toBe(false);
  });

  it("rejects from > to (inverted range)", () => {
    const result = resolveDateRange({ from: "2026-03-31", to: "2026-03-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/from.*after.*to/i);
  });

  it("rejects invalid month 2026-13", () => {
    const result = resolveDateRange({ month: "2026-13" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/YYYY-MM/i);
  });

  it("rejects malformed month string", () => {
    const result = resolveDateRange({ month: "26-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/YYYY-MM/i);
  });

  it("rejects month 2026-00 (month zero)", () => {
    const result = resolveDateRange({ month: "2026-00" });
    expect(result.ok).toBe(false);
  });
});
