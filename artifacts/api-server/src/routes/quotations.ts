import { Router } from "express";
import { db, quotationsTable, activityLogTable, jobsTable, settingsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  CreateQuotationBody,
  UpdateQuotationParams,
  UpdateQuotationBody,
  DeleteQuotationParams,
  ListQuotationsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDirector } from "../middlewares/requireDirector";

const router = Router();

async function generateQuotationNumber(): Promise<string> {
  const [last] = await db.select({ num: quotationsTable.quotationNumber })
    .from(quotationsTable)
    .orderBy(sql`${quotationsTable.id} DESC`)
    .limit(1);
  if (!last) return "GSC-QTN-001";
  const num = parseInt(last.num.replace("GSC-QTN-", "")) + 1;
  return `GSC-QTN-${String(num).padStart(3, "0")}`;
}

async function logActivity(username: string, action: string, recordId: number | null, details: string) {
  await db.insert(activityLogTable).values({ username, action, recordType: "Quotation", recordId, details });
}

function formatRow(r: typeof quotationsTable.$inferSelect) {
  return {
    ...r,
    amount: parseFloat(r.amount),
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/quotations", requireAuth, async (req, res): Promise<void> => {
  const params = ListQuotationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [];
  if (params.data.status) {
    conditions.push(eq(quotationsTable.status, params.data.status) as any);
  }
  if (params.data.search) {
    const term = `%${params.data.search}%`;
    conditions.push(ilike(quotationsTable.clientName, term) as any);
  }

  const rows = conditions.length > 0
    ? await db.select().from(quotationsTable).where(and(...conditions)).orderBy(sql`${quotationsTable.createdAt} DESC`)
    : await db.select().from(quotationsTable).orderBy(sql`${quotationsTable.createdAt} DESC`);

  res.json(rows.map(formatRow));
});

router.post("/quotations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const quotationNumber = await generateQuotationNumber();
  const username = req.session.username!;

  const items = parsed.data.items.map((it) => ({
    serviceType: it.serviceType,
    description: it.description ?? null,
    amount: it.amount,
  }));
  const total = items.reduce((s, it) => s + it.amount, 0);

  const [row] = await db.insert(quotationsTable).values({
    quotationNumber,
    clientName: parsed.data.clientName,
    location: parsed.data.location ?? null,
    date: parsed.data.date,
    expiryDate: parsed.data.expiryDate ?? null,
    status: "Pending",
    items,
    amount: total.toFixed(2),
    notes: parsed.data.notes ?? null,
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", row.id, `${quotationNumber} for ${parsed.data.clientName} — KES ${total.toFixed(2)}`);

  res.status(201).json(formatRow(row));
});

router.patch("/quotations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;

  // All quotation edits are director-only; associates may only view and print.
  if (req.session.role !== "director") {
    res.status(403).json({ error: "Director access required to update quotations" });
    return;
  }

  // Fetch existing row before update so we can detect status transitions.
  const [existing] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }

  const updateValues: Partial<typeof quotationsTable.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (parsed.data.clientName !== undefined) updateValues.clientName = parsed.data.clientName;
  if (parsed.data.location !== undefined) updateValues.location = parsed.data.location;
  if (parsed.data.date !== undefined) updateValues.date = parsed.data.date;
  if (parsed.data.expiryDate !== undefined) updateValues.expiryDate = parsed.data.expiryDate;
  if (parsed.data.status !== undefined) updateValues.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateValues.notes = parsed.data.notes;

  if (parsed.data.items !== undefined) {
    const items = parsed.data.items.map((it) => ({
      serviceType: it.serviceType,
      description: it.description ?? null,
      amount: it.amount,
    }));
    const total = items.reduce((s, it) => s + it.amount, 0);
    updateValues.items = items;
    updateValues.amount = total.toFixed(2);
  }

  const [row] = await db.update(quotationsTable)
    .set(updateValues)
    .where(eq(quotationsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }

  await logActivity(username, "Edited", row.id, `${row.quotationNumber} — status: ${row.status}`);

  // Auto-create a job when a quotation transitions to Accepted for the first time.
  if (parsed.data.status === "Accepted" && existing.status !== "Accepted") {
    const items = (row.items as { serviceType: string; description: string | null; amount: number }[]) ?? [];
    const total = items.reduce((s, it) => s + it.amount, 0);
    const serviceType = items.length > 1 ? "Multiple Services" : (items[0]?.serviceType ?? "Service");
    const description = items.length === 1 ? (items[0]?.description ?? null) : null;

    const [wageSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "wagePerPersonPerDay"));
    const wageRate = wageSetting ? parseFloat(wageSetting.value) : 1000;
    const teamMembers = 1;
    const wages = teamMembers * wageRate;
    const netIncome = total - wages;

    const [newJob] = await db.insert(jobsTable).values({
      date: row.date,
      clientName: row.clientName,
      location: row.location ?? null,
      serviceType,
      description,
      amount: String(total),
      teamMembers,
      wages: String(wages),
      netIncome: String(netIncome),
      items: items.length > 0 ? items : null,
      createdBy: username,
    }).returning({ id: jobsTable.id });

    await db.insert(activityLogTable).values({
      username,
      action: "Added",
      recordType: "Job",
      recordId: newJob.id,
      details: `Auto-created from ${row.quotationNumber} — ${serviceType} for ${row.clientName} on ${row.date} — KES ${total.toFixed(2)}`,
    });
  }

  res.json(formatRow(row));
});

router.delete("/quotations/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = DeleteQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(quotationsTable).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }

  await logActivity(req.session.username!, "Deleted", params.data.id, `${row.quotationNumber} for ${row.clientName}`);

  res.sendStatus(204);
});

export default router;
