import { Router } from "express";
import { db, receiptsTable, activityLogTable } from "@workspace/db";
import { eq, ilike, or, and, gte, lt, sql } from "drizzle-orm";
import {
  CreateReceiptBody,
  GetReceiptParams,
  DeleteReceiptParams,
  UpdateReceiptParams,
  UpdateReceiptBody,
  ListReceiptsQueryParams,
  GetReceiptsSummaryQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDirector } from "../middlewares/requireDirector";
import { resolveDateRange } from "../lib/date-range";

const router = Router();

async function generateReceiptNumber(): Promise<string> {
  const [last] = await db.select({ num: receiptsTable.receiptNumber })
    .from(receiptsTable)
    .orderBy(sql`${receiptsTable.id} DESC`)
    .limit(1);
  if (!last) return "GSC-RCT-001";
  const num = parseInt(last.num.replace("GSC-RCT-", "")) + 1;
  return `GSC-RCT-${String(num).padStart(3, "0")}`;
}

async function logActivity(username: string, action: string, recordType: string, recordId: number | null, details: string) {
  await db.insert(activityLogTable).values({ username, action, recordType, recordId, details });
}

function formatRow(r: typeof receiptsTable.$inferSelect) {
  const items = r.items && r.items.length > 0
    ? r.items
    : [{ serviceType: r.serviceType, description: r.description, amount: parseFloat(r.amount) }];
  return {
    ...r,
    items,
    amount: parseFloat(r.amount),
    lastEditedAt: r.lastEditedAt?.toISOString() ?? null,
  };
}

// Summary must come before /:id to avoid route conflict
router.get("/receipts/summary", requireAuth, async (req, res): Promise<void> => {
  const params = GetReceiptsSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const resolved = resolveDateRange(params.data);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { start, end } = resolved.range;

  const rows = await db.select().from(receiptsTable)
    .where(and(gte(receiptsTable.date, start), lt(receiptsTable.date, end)));

  const total = rows.length;
  const totalPaid = rows.filter(r => r.paymentStatus === "Paid").length;
  const totalPending = rows.filter(r => r.paymentStatus === "Pending").length;
  const totalPartial = rows.filter(r => r.paymentStatus === "Partial").length;
  const amountPaid = rows.filter(r => r.paymentStatus === "Paid").reduce((s, r) => s + parseFloat(r.amount), 0);
  const amountPending = rows.filter(r => r.paymentStatus === "Pending").reduce((s, r) => s + parseFloat(r.amount), 0);
  const amountPartial = rows.filter(r => r.paymentStatus === "Partial").reduce((s, r) => s + parseFloat(r.amount), 0);

  res.json({ total, totalPaid, totalPending, totalPartial, amountPaid, amountPending, amountPartial });
});

router.get("/receipts", requireAuth, async (req, res): Promise<void> => {
  const params = ListReceiptsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [];

  if (params.data.from || params.data.to || params.data.month) {
    const resolved = resolveDateRange(params.data);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    conditions.push(gte(receiptsTable.date, resolved.range.start) as any, lt(receiptsTable.date, resolved.range.end) as any);
  }
  if (params.data.status) {
    conditions.push(eq(receiptsTable.paymentStatus, params.data.status) as any);
  }
  if (params.data.serviceType) {
    conditions.push(eq(receiptsTable.serviceType, params.data.serviceType) as any);
  }
  if (params.data.search) {
    const term = `%${params.data.search}%`;
    conditions.push(or(ilike(receiptsTable.clientName, term), ilike(receiptsTable.receiptNumber, term)) as any);
  }

  const rows = conditions.length > 0
    ? await db.select().from(receiptsTable).where(and(...conditions)).orderBy(sql`${receiptsTable.createdAt} DESC`)
    : await db.select().from(receiptsTable).orderBy(sql`${receiptsTable.createdAt} DESC`);

  res.json(rows.map(formatRow));
});

router.post("/receipts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const receiptNumber = await generateReceiptNumber();
  const username = req.session.username!;

  const items = parsed.data.items.map((it) => ({
    serviceType: it.serviceType,
    description: it.description ?? null,
    amount: it.amount,
  }));
  const total = items.reduce((s, it) => s + it.amount, 0);
  const serviceType = items.length === 1 ? items[0].serviceType : "Multiple Services";

  const [row] = await db.insert(receiptsTable).values({
    receiptNumber,
    jobId: parsed.data.jobId ?? null,
    clientName: parsed.data.clientName,
    serviceType,
    description: null,
    items,
    amount: total.toFixed(2),
    date: parsed.data.date,
    paymentStatus: parsed.data.paymentStatus ?? "Pending",
    notes: parsed.data.notes ?? null,
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", "Receipt", row.id, `${receiptNumber} for ${parsed.data.clientName} — KES ${total.toFixed(2)}`);

  res.status(201).json(formatRow(row));
});

router.get("/receipts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  res.json(formatRow(row));
});

router.patch("/receipts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;

  const [row] = await db.update(receiptsTable)
    .set({
      paymentStatus: parsed.data.paymentStatus,
      notes: parsed.data.notes,
      lastEditedBy: username,
      lastEditedAt: new Date(),
    })
    .where(eq(receiptsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  await logActivity(username, "Edited", "Receipt", row.id, `${row.receiptNumber} — status: ${row.paymentStatus}`);

  res.json(formatRow(row));
});

router.delete("/receipts/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
  const params = DeleteReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(receiptsTable).where(eq(receiptsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  await logActivity(req.session.username!, "Deleted", "Receipt", params.data.id, `${row.receiptNumber} for ${row.clientName}`);

  res.sendStatus(204);
});

export default router;
