import { Router } from "express";
import { db, jobsTable, expensesTable, clientsTable } from "@workspace/db";
import { sql, and, gte, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Resolve the active range (end is exclusive) plus the equal-length immediately
// preceding range for "vs previous period" comparisons.
// Priority: explicit from+to date range → month (YYYY-MM) → current month.
function getRange(
  from?: string,
  to?: string,
  monthStr?: string,
): { start: string; end: string; prevStart: string; prevEnd: string } {
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
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - lengthMs);

  return { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// Validate query params then resolve the range. Returns null (after sending a
// 400) when inputs are malformed so the handler can bail early.
function resolveRange(
  req: { query: Record<string, unknown> },
  res: { status: (c: number) => { json: (b: unknown) => void } },
): { start: string; end: string; prevStart: string; prevEnd: string } | null {
  const { from, to, month } = req.query as { from?: string; to?: string; month?: string };

  if (from || to) {
    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      res.status(400).json({ error: "'from' and 'to' must both be provided in YYYY-MM-DD format" });
      return null;
    }
    if (from > to) {
      res.status(400).json({ error: "'from' must not be after 'to'" });
      return null;
    }
  }
  if (month && !MONTH_RE.test(month)) {
    res.status(400).json({ error: "'month' must be in YYYY-MM format" });
    return null;
  }

  return getRange(from, to, month);
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const range = resolveRange(req, res);
  if (!range) return;
  const { start, end, prevStart, prevEnd } = range;

  const [cur, prev] = await Promise.all([
    db.select({
      revenue: sql<string>`COALESCE(SUM(${jobsTable.amount}), 0)`,
      jobCount: sql<string>`COUNT(*)`,
    }).from(jobsTable).where(and(gte(jobsTable.date, start), lt(jobsTable.date, end))),
    db.select({
      revenue: sql<string>`COALESCE(SUM(${jobsTable.amount}), 0)`,
      jobCount: sql<string>`COUNT(*)`,
    }).from(jobsTable).where(and(gte(jobsTable.date, prevStart), lt(jobsTable.date, prevEnd))),
  ]);

  const [curExp, prevExp] = await Promise.all([
    db.select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable).where(and(gte(expensesTable.date, start), lt(expensesTable.date, end))),
    db.select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable).where(and(gte(expensesTable.date, prevStart), lt(expensesTable.date, prevEnd))),
  ]);

  const revenue = parseFloat(cur[0].revenue);
  const expenses = parseFloat(curExp[0].total);
  const netProfit = revenue - expenses;
  const jobCount = parseInt(cur[0].jobCount);

  const prevRevenue = parseFloat(prev[0].revenue);
  const prevExpenses = parseFloat(prevExp[0].total);
  const prevNetProfit = prevRevenue - prevExpenses;
  const prevJobCount = parseInt(prev[0].jobCount);

  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100 * 10) / 10;

  res.json({
    revenue,
    expenses,
    netProfit,
    jobCount,
    revenueChange: pct(revenue, prevRevenue),
    expensesChange: pct(expenses, prevExpenses),
    netProfitChange: pct(netProfit, prevNetProfit),
    jobCountChange: pct(jobCount, prevJobCount),
  });
});

router.get("/dashboard/daily-revenue", requireAuth, async (req, res): Promise<void> => {
  const range = resolveRange(req, res);
  if (!range) return;
  const { start, end } = range;

  const rows = await db.select({
    day: jobsTable.date,
    revenue: sql<string>`SUM(${jobsTable.amount})`,
  }).from(jobsTable)
    .where(and(gte(jobsTable.date, start), lt(jobsTable.date, end)))
    .groupBy(jobsTable.date)
    .orderBy(jobsTable.date);

  res.json(rows.map(r => ({ day: r.day, revenue: parseFloat(r.revenue) })));
});

router.get("/dashboard/revenue-by-service", requireAuth, async (req, res): Promise<void> => {
  const range = resolveRange(req, res);
  if (!range) return;
  const { start, end } = range;

  const rows = await db.select({
    serviceType: jobsTable.serviceType,
    revenue: sql<string>`SUM(${jobsTable.amount})`,
  }).from(jobsTable)
    .where(and(gte(jobsTable.date, start), lt(jobsTable.date, end)))
    .groupBy(jobsTable.serviceType)
    .orderBy(sql`SUM(${jobsTable.amount}) DESC`);

  res.json(rows.map(r => ({ serviceType: r.serviceType, revenue: parseFloat(r.revenue) })));
});

router.get("/dashboard/top-clients", requireAuth, async (req, res): Promise<void> => {
  const range = resolveRange(req, res);
  if (!range) return;
  const { start, end } = range;

  const rows = await db.select({
    clientName: jobsTable.clientName,
    totalSpent: sql<string>`SUM(${jobsTable.amount})`,
    jobCount: sql<string>`COUNT(*)`,
  }).from(jobsTable)
    .where(and(gte(jobsTable.date, start), lt(jobsTable.date, end)))
    .groupBy(jobsTable.clientName)
    .orderBy(sql`SUM(${jobsTable.amount}) DESC`)
    .limit(5);

  res.json(rows.map(r => ({
    clientName: r.clientName,
    totalSpent: parseFloat(r.totalSpent),
    jobCount: parseInt(r.jobCount),
  })));
});

router.get("/dashboard/recent-jobs", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(jobsTable)
    .orderBy(sql`${jobsTable.createdAt} DESC`)
    .limit(10);

  res.json(rows.map(r => ({
    ...r,
    amount: parseFloat(r.amount),
    wages: parseFloat(r.wages),
    netIncome: parseFloat(r.netIncome),
  })));
});

export default router;
