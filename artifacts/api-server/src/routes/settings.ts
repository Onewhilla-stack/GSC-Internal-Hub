import { Router } from "express";
import { db, settingsTable, jobsTable, expensesTable, clientsTable, receiptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const DEFAULT_SETTINGS = {
  wagePerPersonPerDay: 1000,
  monthlyRent: 25000,
};

async function getSetting(key: string, defaultVal: number): Promise<number> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row ? parseFloat(row.value) : defaultVal;
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const [wage, rent] = await Promise.all([
    getSetting("wagePerPersonPerDay", DEFAULT_SETTINGS.wagePerPersonPerDay),
    getSetting("monthlyRent", DEFAULT_SETTINGS.monthlyRent),
  ]);
  res.json({ wagePerPersonPerDay: wage, monthlyRent: rent });
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Array<{ key: string; value: string }> = [];
  if (parsed.data.wagePerPersonPerDay !== undefined) {
    updates.push({ key: "wagePerPersonPerDay", value: String(parsed.data.wagePerPersonPerDay) });
  }
  if (parsed.data.monthlyRent !== undefined) {
    updates.push({ key: "monthlyRent", value: String(parsed.data.monthlyRent) });
  }

  for (const u of updates) {
    await db.insert(settingsTable).values(u)
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: u.value } });
  }

  const [wage, rent] = await Promise.all([
    getSetting("wagePerPersonPerDay", DEFAULT_SETTINGS.wagePerPersonPerDay),
    getSetting("monthlyRent", DEFAULT_SETTINGS.monthlyRent),
  ]);
  res.json({ wagePerPersonPerDay: wage, monthlyRent: rent });
});

router.get("/settings/export", requireAuth, async (req, res): Promise<void> => {
  const [jobs, expenses, clients, receipts, settings] = await Promise.all([
    db.select().from(jobsTable),
    db.select().from(expensesTable),
    db.select().from(clientsTable),
    db.select().from(receiptsTable),
    db.select().from(settingsTable),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    jobs: jobs.map(j => ({ ...j, amount: parseFloat(j.amount), wages: parseFloat(j.wages), netIncome: parseFloat(j.netIncome) })),
    expenses: expenses.map(e => ({ ...e, amount: parseFloat(e.amount) })),
    clients,
    receipts: receipts.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    settings,
  });
});

export default router;
