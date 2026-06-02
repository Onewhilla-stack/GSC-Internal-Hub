import { Router } from "express";
import { db, clientsTable, jobsTable } from "@workspace/db";
import { eq, or, ilike, sql } from "drizzle-orm";
import {
  ListClientsQueryParams,
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

async function generateClientCode(): Promise<string> {
  const [last] = await db.select({ code: clientsTable.clientCode })
    .from(clientsTable)
    .orderBy(sql`${clientsTable.id} DESC`)
    .limit(1);

  if (!last) return "GSC-001";
  const num = parseInt(last.code.replace("GSC-", "")) + 1;
  return `GSC-${String(num).padStart(3, "0")}`;
}

router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const params = ListClientsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(clientsTable).$dynamic();

  if (params.data.search) {
    const term = `%${params.data.search}%`;
    query = query.where(or(ilike(clientsTable.name, term), ilike(clientsTable.location ?? "", term)));
  }

  if (params.data.status && params.data.status !== "All") {
    query = query.where(eq(clientsTable.status, params.data.status));
  }

  const rows = await query.orderBy(sql`${clientsTable.id} ASC`);
  res.json(rows);
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clientCode = await generateClientCode();

  const [row] = await db.insert(clientsTable).values({
    clientCode,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    location: parsed.data.location ?? null,
    status: parsed.data.status,
    notes: parsed.data.notes ?? null,
    firstVisitDate: parsed.data.firstVisitDate ?? null,
  }).returning();

  res.status(201).json(row);
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Get transactions by matching client name (or clientId if available)
  const transactions = await db.select().from(jobsTable)
    .where(eq(jobsTable.clientName, client.name))
    .orderBy(sql`${jobsTable.date} DESC`);

  const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalVisits = transactions.length;
  const averageSpend = totalVisits > 0 ? totalSpent / totalVisits : 0;

  // Favourite service
  const serviceCount: Record<string, number> = {};
  for (const t of transactions) {
    serviceCount[t.serviceType] = (serviceCount[t.serviceType] ?? 0) + 1;
  }
  const favouriteService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const dates = transactions.map(t => t.date).sort();
  const firstVisitDate = client.firstVisitDate ?? dates[0] ?? null;
  const lastVisitDate = dates[dates.length - 1] ?? null;

  res.json({
    client,
    stats: { totalSpent, totalVisits, averageSpend, favouriteService, firstVisitDate, lastVisitDate },
    transactions: transactions.map(t => ({
      id: t.id,
      date: t.date,
      serviceType: t.serviceType,
      description: t.description,
      amount: parseFloat(t.amount),
      netIncome: parseFloat(t.netIncome),
    })),
  });
});

router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(row);
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
