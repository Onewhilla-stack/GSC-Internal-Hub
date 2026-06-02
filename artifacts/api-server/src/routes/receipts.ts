import { Router } from "express";
import { db, receiptsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateReceiptBody,
  GetReceiptParams,
  DeleteReceiptParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

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

router.get("/receipts", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(receiptsTable).orderBy(sql`${receiptsTable.createdAt} DESC`);
  res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
});

router.post("/receipts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const receiptNumber = await generateReceiptNumber();

  const [row] = await db.insert(receiptsTable).values({
    receiptNumber,
    jobId: parsed.data.jobId ?? null,
    clientName: parsed.data.clientName,
    serviceType: parsed.data.serviceType,
    description: parsed.data.description ?? null,
    amount: String(parsed.data.amount),
    date: parsed.data.date,
  }).returning();

  res.status(201).json({ ...row, amount: parseFloat(row.amount) });
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

  res.json({ ...row, amount: parseFloat(row.amount) });
});

router.delete("/receipts/:id", requireAuth, async (req, res): Promise<void> => {
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

  res.sendStatus(204);
});

export default router;
