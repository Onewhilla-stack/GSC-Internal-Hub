import { Router } from "express";
import { db, jobsTable } from "@workspace/db";
import { and, gte, lt, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/worker/dashboard", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const todayJobs = await db.select().from(jobsTable)
    .where(and(gte(jobsTable.date, today), lt(jobsTable.date, tomorrow)))
    .orderBy(sql`${jobsTable.date} DESC`);

  res.json({
    greeting: `Welcome, ${req.session.username}`,
    todayJobs: todayJobs.map(j => ({
      ...j,
      amount: parseFloat(j.amount),
      wages: parseFloat(j.wages),
      netIncome: parseFloat(j.netIncome),
    })),
  });
});

export default router;
