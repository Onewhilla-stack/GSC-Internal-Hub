import { Router } from "express";
import { db, jobsTable, clientsTable, settingsTable, activityLogTable, receiptsTable } from "@workspace/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { generateClientCode } from "../lib/client-code";
import { logger } from "../lib/logger";
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
import { requireDirector } from "../middlewares/requireDirector";
import { resolveDateRange } from "../lib/date-range";
import { resolveWageRate, computeJobMoney } from "../lib/job-money";
import { resolveJobServices, resolveJobUpdateServices } from "../lib/job-services";

const router = Router();

async function getWageRate(): Promise<number> {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "wagePerPersonPerDay"));
  return resolveWageRate(setting?.value);
}

async function logActivity(username: string, action: string, recordType: string, recordId: number | null, details: string) {
  await db.insert(activityLogTable).values({ username, action, recordType, recordId, details });
}

// Logging a visit also makes sure the client exists in the Clients database.
// Clients are matched by name (case-insensitive). When a matching client is
// found, its id is returned (and a missing phone is backfilled if one was
// supplied); otherwise a new client record is auto-created from the visit.
async function linkOrCreateClient(
  name: string,
  phone: string | undefined,
  location: string | undefined,
  date: string,
  username: string,
): Promise<number | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  const trimmedPhone = phone?.trim() || null;

  const [existing] = await db
    .select()
    .from(clientsTable)
    .where(sql`lower(trim(${clientsTable.name})) = lower(${trimmedName})`)
    .limit(1);

  if (existing) {
    if (trimmedPhone && !existing.phone) {
      await db.update(clientsTable)
        .set({ phone: trimmedPhone, lastEditedBy: username, lastEditedAt: new Date() })
        .where(eq(clientsTable.id, existing.id));
    }
    return existing.id;
  }

  const clientCode = await generateClientCode();
  const [created] = await db.insert(clientsTable).values({
    clientCode,
    name: trimmedName,
    phone: trimmedPhone,
    location: location?.trim() || null,
    status: "New",
    firstVisitDate: date,
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", "Client", created.id, `${trimmedName} (${clientCode}) — auto-added from visit`);
  return created.id;
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.from || params.data.to || params.data.month) {
    const resolved = resolveDateRange(params.data);
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    conditions.push(gte(jobsTable.date, resolved.range.start), lt(jobsTable.date, resolved.range.end));
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
    lastEditedAt: r.lastEditedAt?.toISOString() ?? null,
  })));
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const wageRate = await getWageRate();
  const { teamMembers } = parsed.data;

  const resolved = resolveJobServices(parsed.data);
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }
  const { serviceType, amount, items } = resolved;

  const { wages, netIncome } = computeJobMoney({ teamMembers, wageRate, amount });
  const username = req.session.username!;

  // When the caller already references a client, trust it. Otherwise make sure
  // the client exists in the Clients database (auto-create/link). A failure here
  // must never block logging the visit, so fall back to leaving the job unlinked.
  let linkedClientId: number | null = parsed.data.clientId ?? null;
  if (linkedClientId == null) {
    try {
      linkedClientId = await linkOrCreateClient(
        parsed.data.clientName,
        parsed.data.clientPhone,
        parsed.data.location,
        parsed.data.date,
        username,
      );
    } catch (err) {
      logger.warn({ err }, "Failed to auto-create/link client for visit; logging without client link");
      linkedClientId = null;
    }
  }

  const [row] = await db.insert(jobsTable).values({
    clientId: linkedClientId,
    clientName: parsed.data.clientName,
    date: parsed.data.date,
    serviceType,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    items,
    amount: String(amount),
    teamMembers,
    wages: String(wages),
    netIncome: String(netIncome),
    notes: parsed.data.notes ?? null,
    createdBy: username,
  }).returning();

  await logActivity(username, "Added", "Job", row.id, `${serviceType} for ${parsed.data.clientName} on ${parsed.data.date} — KES ${amount}`);

  res.status(201).json({
    ...row,
    amount: parseFloat(row.amount),
    wages: parseFloat(row.wages),
    netIncome: parseFloat(row.netIncome),
    lastEditedAt: null,
  });
});

router.post("/jobs/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportJobsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const wageRate = await getWageRate();
  const username = req.session.username!;
  let imported = 0;
  let errors = 0;

  for (const row of parsed.data.rows) {
    try {
      const { wages, netIncome } = computeJobMoney({ teamMembers: row.teamMembers, wageRate, amount: row.amount });
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
        createdBy: username,
      });
      imported++;
    } catch {
      errors++;
    }
  }

  if (imported > 0) {
    await logActivity(username, "Added", "Job", null, `Imported ${imported} jobs via CSV`);
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

  res.json({ ...row, amount: parseFloat(row.amount), wages: parseFloat(row.wages), netIncome: parseFloat(row.netIncome), lastEditedAt: row.lastEditedAt?.toISOString() ?? null });
});

router.patch("/jobs/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
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
  const username = req.session.username!;

  // Recompute the monetary fields. The items field decides whether to replace,
  // keep, or collapse the stored line items (see resolveJobUpdateServices).
  const resolvedUpdate = resolveJobUpdateServices(
    { items: parsed.data.items, serviceType: parsed.data.serviceType, amount: parsed.data.amount },
    { serviceType: existing[0].serviceType, amount: parseFloat(existing[0].amount), items: existing[0].items },
  );
  if (!resolvedUpdate.ok) {
    res.status(400).json({ error: resolvedUpdate.error });
    return;
  }
  const { serviceType, amount, items } = resolvedUpdate;
  const { wages, netIncome } = computeJobMoney({ teamMembers, wageRate, amount });

  const [row] = await db.update(jobsTable).set({
    clientId: parsed.data.clientId,
    clientName: parsed.data.clientName,
    date: parsed.data.date,
    serviceType,
    description: parsed.data.description,
    location: parsed.data.location,
    items,
    amount: String(amount),
    teamMembers,
    wages: String(wages),
    netIncome: String(netIncome),
    notes: parsed.data.notes,
    lastEditedBy: username,
    lastEditedAt: new Date(),
  }).where(eq(jobsTable.id, params.data.id)).returning();

  await logActivity(username, "Edited", "Job", row.id, `${row.serviceType} for ${row.clientName} on ${row.date}`);

  // Keep receipts generated from this visit in sync with its services. A receipt
  // always stores an items array, so a single-service job is mirrored as a
  // one-item list; the total and the "Multiple Services" label are derived the
  // same way as receipt creation so the two never silently drift apart.
  if (parsed.data.syncReceipts) {
    const linked = await db.select().from(receiptsTable).where(eq(receiptsTable.jobId, params.data.id));
    if (linked.length > 0) {
      const receiptItems = row.items && row.items.length > 0
        ? row.items.map((it) => ({ serviceType: it.serviceType, description: it.description ?? null, amount: it.amount }))
        : [{ serviceType: row.serviceType, description: row.description, amount: parseFloat(row.amount) }];
      const receiptTotal = receiptItems.reduce((s, it) => s + it.amount, 0);
      const receiptServiceType = receiptItems.length === 1 ? receiptItems[0].serviceType : "Multiple Services";

      for (const rec of linked) {
        await db.update(receiptsTable).set({
          items: receiptItems,
          serviceType: receiptServiceType,
          description: null,
          amount: receiptTotal.toFixed(2),
          lastEditedBy: username,
          lastEditedAt: new Date(),
        }).where(eq(receiptsTable.id, rec.id));
        await logActivity(username, "Edited", "Receipt", rec.id, `${rec.receiptNumber} — synced to job services (KES ${receiptTotal.toFixed(2)})`);
      }
    }
  }

  res.json({ ...row, amount: parseFloat(row.amount), wages: parseFloat(row.wages), netIncome: parseFloat(row.netIncome), lastEditedAt: row.lastEditedAt?.toISOString() ?? null });
});

router.delete("/jobs/:id", requireAuth, requireDirector, async (req, res): Promise<void> => {
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

  const username = req.session.username!;

  // Receipts generated from this visit point back at it via jobId. Deleting the
  // job would leave them with a dangling reference (a 404 source job), so clear
  // the link instead of orphaning it — the receipt itself is kept intact.
  const unlinked = await db.update(receiptsTable)
    .set({ jobId: null })
    .where(eq(receiptsTable.jobId, params.data.id))
    .returning();

  await logActivity(username, "Deleted", "Job", params.data.id, `${row.serviceType} for ${row.clientName} on ${row.date}`);

  for (const rec of unlinked) {
    await logActivity(username, "Edited", "Receipt", rec.id, `${rec.receiptNumber} — unlinked from deleted job`);
  }

  res.sendStatus(204);
});

export default router;
