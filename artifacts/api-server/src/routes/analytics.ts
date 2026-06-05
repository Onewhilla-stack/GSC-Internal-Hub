import { Router } from "express";
import { db, jobsTable, expensesTable } from "@workspace/db";
import { sql, gte, lt, and, eq } from "drizzle-orm";
import { GetMonthDrillQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { aggregateRevenueByService, aggregateServiceCounts } from "../lib/service-breakdown";

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
    amount: jobsTable.amount,
    items: jobsTable.items,
  }).from(jobsTable);

  res.json(aggregateRevenueByService(rows));
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
  const [jobsByMonth, expByMonth, topClientRow, serviceRows, avgJob] = await Promise.all([
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
      items: jobsTable.items,
    }).from(jobsTable),
    db.select({ avg: sql<string>`AVG(${jobsTable.amount})` }).from(jobsTable),
  ]);

  const serviceCounts = aggregateServiceCounts(serviceRows);

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
    mostPopularService: serviceCounts[0]?.serviceType ?? "-",
    topClientAllTime: topClientRow[0]?.clientName ?? "-",
    avgRevenuePerJob: parseFloat(avgJob[0]?.avg ?? "0"),
    avgMonthlyProfit: Math.round(avgMonthlyProfit * 100) / 100,
    serviceCounts,
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
  // Previous month window for month-over-month service count deltas.
  const prevStart = new Date(year, mon - 2, 1).toISOString().split("T")[0];

  const [jobs, expenses, prevJobs] = await Promise.all([
    db.select().from(jobsTable).where(and(gte(jobsTable.date, start), lt(jobsTable.date, end))).orderBy(sql`${jobsTable.date} DESC`),
    db.select({
      category: expensesTable.category,
      total: sql<string>`SUM(${expensesTable.amount})`,
    }).from(expensesTable)
      .where(and(gte(expensesTable.date, start), lt(expensesTable.date, end)))
      .groupBy(expensesTable.category)
      .orderBy(sql`SUM(${expensesTable.amount}) DESC`),
    db.select({
      serviceType: jobsTable.serviceType,
      amount: jobsTable.amount,
      items: jobsTable.items,
    }).from(jobsTable).where(and(gte(jobsTable.date, prevStart), lt(jobsTable.date, start))),
  ]);

  const revenue = jobs.reduce((s, j) => s + parseFloat(j.amount), 0);
  const expTotal = expenses.reduce((s, e) => s + parseFloat(e.total), 0);

  // Reuse the shared per-line-item counting helper for both months, then credit
  // each current-month service its change versus the previous month.
  const prevCounts = new Map(
    aggregateServiceCounts(prevJobs).map(c => [c.serviceType, c.count]),
  );
  const serviceCounts = aggregateServiceCounts(jobs).map(c => ({
    ...c,
    delta: c.count - (prevCounts.get(c.serviceType) ?? 0),
  }));

  // Compute per-service revenue for current and previous month using the same
  // line-item attribution logic as aggregateRevenueByService.
  const prevRevenueMap = new Map(
    aggregateRevenueByService(prevJobs).map(r => [r.serviceType, r.revenue]),
  );
  const serviceRevenue = aggregateRevenueByService(jobs).map(r => {
    const prevRev = prevRevenueMap.get(r.serviceType);
    const revenueDelta = prevRev !== undefined ? Math.round((r.revenue - prevRev) * 100) / 100 : null;
    return { serviceType: r.serviceType, revenue: r.revenue, revenueDelta };
  });

  res.json({
    month,
    revenue,
    expenses: expTotal,
    netProfit: revenue - expTotal,
    jobCount: jobs.length,
    jobs: jobs.map(j => ({ ...j, amount: parseFloat(j.amount), wages: parseFloat(j.wages), netIncome: parseFloat(j.netIncome) })),
    expenseBreakdown: expenses.map(e => ({ category: e.category, total: parseFloat(e.total) })),
    serviceCounts,
    serviceRevenue,
  });
});

router.get("/analytics/service-revenue-trend", requireAuth, async (req, res): Promise<void> => {
  const rawMonths = parseInt(String(req.query.months ?? "12"), 10);
  const lookback = Math.min(Math.max(rawMonths, 1), 24);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - lookback + 1, 1);
  const startStr = start.toISOString().split("T")[0];

  const rows = await db.select({
    date: jobsTable.date,
    serviceType: jobsTable.serviceType,
    amount: jobsTable.amount,
    items: jobsTable.items,
  }).from(jobsTable).where(gte(jobsTable.date, startStr));

  // Group rows by YYYY-MM month key
  const byMonth = new Map<string, typeof rows>();
  for (const row of rows) {
    const m = monthKey(row.date);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(row);
  }

  // Aggregate revenue per service per month and track totals across all months
  const serviceTotals = new Map<string, number>();
  const monthServiceRevenue = new Map<string, Map<string, number>>();

  const allMonths: string[] = [];
  for (let i = 0; i < lookback; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - lookback + 1 + i, 1);
    allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  for (const m of allMonths) {
    const monthRows = byMonth.get(m) ?? [];
    const breakdown = aggregateRevenueByService(monthRows);
    const serviceMap = new Map<string, number>();
    for (const entry of breakdown) {
      serviceMap.set(entry.serviceType, entry.revenue);
      serviceTotals.set(entry.serviceType, (serviceTotals.get(entry.serviceType) ?? 0) + entry.revenue);
    }
    monthServiceRevenue.set(m, serviceMap);
  }

  // Pick top 5 services by total revenue across the period
  const TOP_N = 5;
  const topServices = [...serviceTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([s]) => s);

  // Build the response: one row per month with revenue nested as a service→amount map
  const months = allMonths.map(m => {
    const serviceMap = monthServiceRevenue.get(m) ?? new Map();
    const revenue: Record<string, number> = {};
    for (const svc of topServices) {
      revenue[svc] = Math.round((serviceMap.get(svc) ?? 0) * 100) / 100;
    }
    return { month: m, revenue };
  });

  res.json({ services: topServices, months });
});

export default router;
