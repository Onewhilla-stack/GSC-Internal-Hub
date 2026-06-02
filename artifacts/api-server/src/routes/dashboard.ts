import { Router } from "express";
import { db, jobsTable, expensesTable, clientsTable } from "@workspace/db";
import { sql, and, gte, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveDateRange, type RangeQuery } from "../lib/date-range";
import { aggregateRevenueByService } from "../lib/service-breakdown";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const resolved = resolveDateRange(req.query as RangeQuery);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { start, end, prevStart, prevEnd } = resolved.range;

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
  const resolved = resolveDateRange(req.query as RangeQuery);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { start, end } = resolved.range;

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
  const resolved = resolveDateRange(req.query as RangeQuery);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { start, end } = resolved.range;

  const rows = await db.select({
    serviceType: jobsTable.serviceType,
    amount: jobsTable.amount,
    items: jobsTable.items,
  }).from(jobsTable)
    .where(and(gte(jobsTable.date, start), lt(jobsTable.date, end)));

  res.json(aggregateRevenueByService(rows));
});

router.get("/dashboard/top-clients", requireAuth, async (req, res): Promise<void> => {
  const resolved = resolveDateRange(req.query as RangeQuery);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { start, end } = resolved.range;

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
