import { Router } from "express";
import { db, jobsTable, expensesTable } from "@workspace/db";
import { sql, gte, lt, and, eq } from "drizzle-orm";
import { GetMonthDrillQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function monthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

router.get("/analytics/pl", requireAuth, async (req, res): Promise<void> => {
  const jobs = await db.select({
    month: sql<string>`to_char(${jobsTable.date}::date, 'YYYY-MM')`,
    revenue: sql<string>`SUM(${jobsTable.amount})`,
    jobCount: sql<string>`COUNT(*)`,
  }).from(jobsTable).groupBy(sql`to_char(${jobsTable.date}::date, 'YYYY-MM')`).orderBy(sql`to_char(${jobsTable.date}::date, 'YYYY-MM') ASC`);

  const expenses = await db.select({
    month: sql<string>`to_char(${expensesTable.date}::date, 'YYYY-MM')`,
    total: sql<string>`SUM(${expensesTable.amount})`,
  }).from(expensesTable).groupBy(sql`to_char(${expensesTable.date}::date, 'YYYY-MM')`);

  const expMap: Record<string, number> = {};
  for (const e of expenses) expMap[e.month] = parseFloat(e.total);

  const months = jobs.map((j, i) => {
    const revenue = parseFloat(j.revenue);
    const exp = expMap[j.month] ?? 0;
    const netProfit = revenue - exp;
    const prev = jobs[i - 1];
    let revenueChange: number | null = null;
    if (prev) {
      const prevRev = parseFloat(prev.revenue);
      revenueChange = prevRev === 0 ? null : Math.round(((revenue - prevRev) / prevRev) * 100 * 10) / 10;
    }
    return { month: j.month, revenue, expenses: exp, netProfit, jobCount: parseInt(j.jobCount), revenueChange };
  });

  // Add months that only have expenses
  for (const e of expenses) {
    if (!months.find(m => m.month === e.month)) {
      months.push({ month: e.month, revenue: 0, expenses: parseFloat(e.total), netProfit: -parseFloat(e.total), jobCount: 0, revenueChange: null });
    }
  }
  months.sort((a, b) => a.month.localeCompare(b.month));

  res.json(months);
});

router.get("/analytics/revenue-trend", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select({
    month: sql<string>`to_char(${jobsTable.date}::date, 'YYYY-MM')`,
    revenue: sql<string>`SUM(${jobsTable.amount})`,
  }).from(jobsTable)
    .groupBy(sql`to_char(${jobsTable.date}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${jobsTable.date}::date, 'YYYY-MM') ASC`);

  res.json(rows.map(r => ({ month: r.month, revenue: parseFloat(r.revenue) })));
});

router.get("/analytics/service-breakdown", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select({
    serviceType: jobsTable.serviceType,
    revenue: sql<string>`SUM(${jobsTable.amount})`,
  }).from(jobsTable)
    .groupBy(jobsTable.serviceType)
    .orderBy(sql`SUM(${jobsTable.amount}) DESC`);

  res.json(rows.map(r => ({ serviceType: r.serviceType, revenue: parseFloat(r.revenue) })));
});

router.get("/analytics/expense-breakdown", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select({
    category: expensesTable.category,
    total: sql<string>`SUM(${expensesTable.amount})`,
  }).from(expensesTable)
    .groupBy(expensesTable.category)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  res.json(rows.map(r => ({ category: r.category, total: parseFloat(r.total) })));
});

router.get("/analytics/key-stats", requireAuth, async (req, res): Promise<void> => {
  const [jobsByMonth, expByMonth, topClientRow, topServiceRow, avgJob] = await Promise.all([
    db.select({
      month: sql<string>`to_char(${jobsTable.date}::date, 'YYYY-MM')`,
      revenue: sql<string>`SUM(${jobsTable.amount})`,
    }).from(jobsTable).groupBy(sql`to_char(${jobsTable.date}::date, 'YYYY-MM')`),
    db.select({
      month: sql<string>`to_char(${expensesTable.date}::date, 'YYYY-MM')`,
      total: sql<string>`SUM(${expensesTable.amount})`,
    }).from(expensesTable).groupBy(sql`to_char(${expensesTable.date}::date, 'YYYY-MM')`),
    db.select({
      clientName: jobsTable.clientName,
      total: sql<string>`SUM(${jobsTable.amount})`,
    }).from(jobsTable).groupBy(jobsTable.clientName).orderBy(sql`SUM(${jobsTable.amount}) DESC`).limit(1),
    db.select({
      serviceType: jobsTable.serviceType,
      cnt: sql<string>`COUNT(*)`,
    }).from(jobsTable).groupBy(jobsTable.serviceType).orderBy(sql`COUNT(*) DESC`).limit(1),
    db.select({ avg: sql<string>`AVG(${jobsTable.amount})` }).from(jobsTable),
  ]);

  const expMap: Record<string, number> = {};
  for (const e of expByMonth) expMap[e.month] = parseFloat(e.total);

  let bestRevMonth = "-";
  let bestProfitMonth = "-";
  let bestRev = -Infinity;
  let bestProfit = -Infinity;

  for (const j of jobsByMonth) {
    const rev = parseFloat(j.revenue);
    const profit = rev - (expMap[j.month] ?? 0);
    if (rev > bestRev) { bestRev = rev; bestRevMonth = j.month; }
    if (profit > bestProfit) { bestProfit = profit; bestProfitMonth = j.month; }
  }

  const avgMonthlyProfits = jobsByMonth.map(j => parseFloat(j.revenue) - (expMap[j.month] ?? 0));
  const avgMonthlyProfit = avgMonthlyProfits.length ? avgMonthlyProfits.reduce((a, b) => a + b, 0) / avgMonthlyProfits.length : 0;

  res.json({
    bestMonthByRevenue: bestRevMonth,
    bestMonthByProfit: bestProfitMonth,
    mostPopularService: topServiceRow[0]?.serviceType ?? "-",
    topClientAllTime: topClientRow[0]?.clientName ?? "-",
    avgRevenuePerJob: parseFloat(avgJob[0]?.avg ?? "0"),
    avgMonthlyProfit: Math.round(avgMonthlyProfit * 100) / 100,
  });
});

router.get("/analytics/month-drill", requireAuth, async (req, res): Promise<void> => {
  const params = GetMonthDrillQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const month = params.data.month!;
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1).toISOString().split("T")[0];
  const end = new Date(year, mon, 1).toISOString().split("T")[0];

  const [jobs, expenses] = await Promise.all([
    db.select().from(jobsTable).where(and(gte(jobsTable.date, start), lt(jobsTable.date, end))).orderBy(sql`${jobsTable.date} DESC`),
    db.select({
      category: expensesTable.category,
      total: sql<string>`SUM(${expensesTable.amount})`,
    }).from(expensesTable)
      .where(and(gte(expensesTable.date, start), lt(expensesTable.date, end)))
      .groupBy(expensesTable.category)
      .orderBy(sql`SUM(${expensesTable.amount}) DESC`),
  ]);

  const revenue = jobs.reduce((s, j) => s + parseFloat(j.amount), 0);
  const expTotal = expenses.reduce((s, e) => s + parseFloat(e.total), 0);

  res.json({
    month,
    revenue,
    expenses: expTotal,
    netProfit: revenue - expTotal,
    jobCount: jobs.length,
    jobs: jobs.map(j => ({ ...j, amount: parseFloat(j.amount), wages: parseFloat(j.wages), netIncome: parseFloat(j.netIncome) })),
    expenseBreakdown: expenses.map(e => ({ category: e.category, total: parseFloat(e.total) })),
  });
});

export default router;
