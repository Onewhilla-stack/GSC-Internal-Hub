import { Router } from "express";
import { db, clientsTable, jobsTable, activityLogTable } from "@workspace/db";
import { eq, or, ilike, sql } from "drizzle-orm";
import {
  ListClientsQueryParams,
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
  ImportClientsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDirector } from "../middlewares/requireDirector";
import { nextClientCodeNumber, formatClientCode, generateClientCode } from "../lib/client-code";

const router = Router();

async function logActivity(username: string, action: string, recordType: string, recordId: number | null, details: string) {
  await db.insert(activityLogTable).values({ username, action, recordType, recordId, details });
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
  res.json(rows.map(r => ({
    ...r,
    lastEditedAt: r.lastEditedAt?.toISOString() ?? null,
  })));
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clientCode = await generateClientCode();
  const username = req.session.username!;

  const [row] = await db.insert(clientsTable).values({
    clientCode,
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    location: parsed.data.location ?? null,
    status: parsed.data.status,
    notes: parsed.data.notes ?? null,
    firstVisitDate: parsed.data.firstVisitDate ?? null,
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", "Client", row.id, `${parsed.data.name} (${clientCode})`);

  res.status(201).json({ ...row, lastEditedAt: null });
});

router.post("/clients/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = req.session.username!;
  let imported = 0;
  let errors = 0;

  // Pre-compute the next auto code once, then increment in-memory so blank-code
  // rows never collide with each other or with explicitly-provided codes.
  let nextNum = await nextClientCodeNumber();
  const explicit = new Set(
    parsed.data.rows.map((r) => r.clientCode?.trim()).filter((c): c is string => !!c)
  );
  const used = new Set<string>();

  for (const row of parsed.data.rows) {
    try {
      let clientCode: string;
      if (row.clientCode && row.clientCode.trim() !== "") {
        clientCode = row.clientCode.trim();
      } else {
        let candidate = formatClientCode(nextNum);
        while (explicit.has(candidate) || used.has(candidate)) {
          nextNum++;
          candidate = formatClientCode(nextNum);
        }
        clientCode = candidate;
        nextNum++;
      }
      used.add(clientCode);
      const [inserted] = await db.insert(clientsTable).values({
        clientCode,
        name: row.name,
        phone: row.phone ?? null,
        email: row.email ?? null,
        location: row.location ?? null,
        status: row.status,
        notes: row.notes ?? null,
        firstVisitDate: row.firstVisitDate ?? null,
        createdBy: username,
      }).onConflictDoNothing().returning();
      if (inserted) {
        imported++;
      } else {
        // Row already exists (duplicate clientCode) — skip silently
        errors++;
      }
    } catch {
      errors++;
    }
  }

  if (imported > 0) {
    await logActivity(username, "Added", "Client", null, `Imported ${imported} clients via CSV`);
  }

  res.json({ imported, errors });
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

  const transactions = await db.select().from(jobsTable)
    .where(eq(jobsTable.clientName, client.name))
    .orderBy(sql`${jobsTable.date} DESC`);

  const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalVisits = transactions.length;
  const averageSpend = totalVisits > 0 ? totalSpent / totalVisits : 0;

  const serviceCount: Record<string, number> = {};
  for (const t of transactions) {
    serviceCount[t.serviceType] = (serviceCount[t.serviceType] ?? 0) + 1;
  }
  const favouriteService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const dates = transactions.map(t => t.date).sort();
  const firstVisitDate = client.firstVisitDate ?? dates[0] ?? null;
  const lastVisitDate = dates[dates.length - 1] ?? null;

  res.json({
    client: { ...client, lastEditedAt: client.lastEditedAt?.toISOString() ?? null },
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

router.patch("/clients/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
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

  const username = req.session.username!;

  const [row] = await db.update(clientsTable)
    .set({ ...parsed.data, lastEditedBy: username, lastEditedAt: new Date() })
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await logActivity(username, "Edited", "Client", row.id, `${row.name} (${row.clientCode})`);

  res.json({ ...row, lastEditedAt: row.lastEditedAt?.toISOString() ?? null });
});

router.delete("/clients/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
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

  await logActivity(req.session.username!, "Deleted", "Client", params.data.id, `${row.name} (${row.clientCode})`);

  res.sendStatus(204);
});

export default router;
