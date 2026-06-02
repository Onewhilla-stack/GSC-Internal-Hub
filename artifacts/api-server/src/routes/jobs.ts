import { Router } from "express";
import { db, jobsTable, settingsTable } from "@workspace/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import {
  ListJobsQueryParams,
  CreateJobBody,
  UpdateJobBody,
  GetJobParams,
  UpdateJobParams,
  DeleteJobParams,
  ImportJobsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

async function getWageRate(): Promise<number> {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "wagePerPersonPerDay"));
  return setting ? parseFloat(setting.value) : 1000;
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.month) {
    const [year, mon] = params.data.month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1).toISOString().split("T")[0];
    const end = new Date(year, mon, 1).toISOString().split("T")[0];
    conditions.push(gte(jobsTable.date, start), lt(jobsTable.date, end));
  }
  if (params.data.serviceType) {
    conditions.push(eq(jobsTable.serviceType, params.data.serviceType));
  }

  const rows = conditions.length > 0
    ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(sql`${jobsTable.date} DESC`)
    : await db.select().from(jobsTable).orderBy(sql`${jobsTable.date} DESC`);

  res.json(rows.map(r => ({
    ...r,
    amount: parseFloat(r.amount),
    wages: parseFloat(r.wages),
    netIncome: parseFloat(r.netIncome),
  })));
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const wageRate = await getWageRate();
  const { teamMembers, amount } = parsed.data;
  const wages = teamMembers * wageRate;
  const netIncome = amount - wages;

  const [row] = await db.insert(jobsTable).values({
    clientId: parsed.data.clientId ?? null,
    clientName: parsed.data.clientName,
    date: parsed.data.date,
    serviceType: parsed.data.serviceType,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    amount: String(amount),
    teamMembers,
    wages: String(wages),
    netIncome: String(netIncome),
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json({
    ...row,
    amount: parseFloat(row.amount),
    wages: parseFloat(row.wages),
    netIncome: parseFloat(row.netIncome),
  });
});

router.post("/jobs/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportJobsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const wageRate = await getWageRate();
  let imported = 0;
  let errors = 0;

  for (const row of parsed.data.rows) {
    try {
      const wages = row.teamMembers * wageRate;
      const netIncome = row.amount - wages;
      await db.insert(jobsTable).values({
        clientName: row.clientName,
        date: row.date,
        serviceType: row.serviceType,
        description: row.description ?? null,
        location: row.location ?? null,
        amount: String(row.amount),
        teamMembers: row.teamMembers,
        wages: String(wages),
        netIncome: String(netIncome),
        notes: row.notes ?? null,
      });
      imported++;
    } catch {
      errors++;
    }
  }

  res.json({ imported, errors });
});

router.get("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({ ...row, amount: parseFloat(row.amount), wages: parseFloat(row.wages), netIncome: parseFloat(row.netIncome) });
});

router.patch("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!existing[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const wageRate = await getWageRate();
  const teamMembers = parsed.data.teamMembers ?? existing[0].teamMembers;
  const amount = parsed.data.amount ?? parseFloat(existing[0].amount);
  const wages = teamMembers * wageRate;
  const netIncome = amount - wages;

  const [row] = await db.update(jobsTable).set({
    clientId: parsed.data.clientId,
    clientName: parsed.data.clientName,
    date: parsed.data.date,
    serviceType: parsed.data.serviceType,
    description: parsed.data.description,
    location: parsed.data.location,
    amount: parsed.data.amount !== undefined ? String(parsed.data.amount) : undefined,
    teamMembers,
    wages: String(wages),
    netIncome: String(netIncome),
    notes: parsed.data.notes,
  }).where(eq(jobsTable.id, params.data.id)).returning();

  res.json({ ...row, amount: parseFloat(row.amount), wages: parseFloat(row.wages), netIncome: parseFloat(row.netIncome) });
});

router.delete("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
