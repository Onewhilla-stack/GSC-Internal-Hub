import { Router } from "express";
import { db, expensesTable, activityLogTable } from "@workspace/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  UpdateExpenseBody,
  UpdateExpenseParams,
  DeleteExpenseParams,
  ImportExpensesBody,
  GetExpensesMonthlySummaryQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDirector } from "../middlewares/requireDirector";

const router = Router();

async function logActivity(username: string, action: string, recordType: string, recordId: number | null, details: string) {
  await db.insert(activityLogTable).values({ username, action, recordType, recordId, details });
}

router.get("/expenses", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = ListExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.month) {
    const [year, mon] = params.data.month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1).toISOString().split("T")[0];
    const end = new Date(year, mon, 1).toISOString().split("T")[0];
    conditions.push(gte(expensesTable.date, start), lt(expensesTable.date, end));
  }
  if (params.data.category) {
    conditions.push(eq(expensesTable.category, params.data.category));
  }

  const rows = conditions.length > 0
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(sql`${expensesTable.date} DESC`)
    : await db.select().from(expensesTable).orderBy(sql`${expensesTable.date} DESC`);

  res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount), lastEditedAt: r.lastEditedAt?.toISOString() ?? null })));
});

router.post("/expenses", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;
  const [row] = await db.insert(expensesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", "Expense", row.id, `${parsed.data.category} — KES ${parsed.data.amount} on ${parsed.data.date}`);

  res.status(201).json({ ...row, amount: parseFloat(row.amount), lastEditedAt: null });
});

router.post("/expenses/import", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const parsed = ImportExpensesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;
  let imported = 0;
  let errors = 0;

  for (const row of parsed.data.rows) {
    try {
      await db.insert(expensesTable).values({
        ...row,
        amount: String(row.amount),
        createdBy: username,
      });
      imported++;
    } catch {
      errors++;
    }
  }

  if (imported > 0) {
    await logActivity(username, "Added", "Expense", null, `Imported ${imported} expenses via CSV`);
  }

  res.json({ imported, errors });
});

router.get("/expenses/monthly-summary", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = GetExpensesMonthlySummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const monthStr = params.data.month ?? "";
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }
  const [year, mon] = monthStr.split("-").map(Number);
  const start = new Date(year, mon - 1, 1).toISOString().split("T")[0];
  const end = new Date(year, mon, 1).toISOString().split("T")[0];

  const rows = await db.select({
    category: expensesTable.category,
    total: sql<string>`SUM(${expensesTable.amount})`,
  }).from(expensesTable)
    .where(and(gte(expensesTable.date, start), lt(expensesTable.date, end)))
    .groupBy(expensesTable.category)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  res.json(rows.map(r => ({ category: r.category, total: parseFloat(r.total) })));
});

router.patch("/expenses/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;
  const [row] = await db.update(expensesTable)
    .set({
      date: parsed.data.date,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount !== undefined ? String(parsed.data.amount) : undefined,
      lastEditedBy: username,
      lastEditedAt: new Date(),
    })
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  await logActivity(username, "Edited", "Expense", row.id, `${row.category} — KES ${row.amount} on ${row.date}`);

  res.json({ ...row, amount: parseFloat(row.amount), lastEditedAt: row.lastEditedAt?.toISOString() ?? null });
});

router.delete("/expenses/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  await logActivity(req.session.username!, "Deleted", "Expense", params.data.id, `${row.category} on ${row.date}`);

  res.sendStatus(204);
});

export default router;
