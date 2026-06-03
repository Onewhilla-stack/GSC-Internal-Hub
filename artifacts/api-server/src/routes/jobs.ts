import { Router } from "express";
import { db, jobsTable, clientsTable, settingsTable, activityLogTable } from "@workspace/db";
import type { JobItem } from "@workspace/db";
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

const router = Router();

async function getWageRate(): Promise<number> {
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "wagePerPersonPerDay"));
  return setting ? parseFloat(setting.value) : 1000;
}

type ResolveServicesInput = {
  serviceType?: string;
  amount?: number;
  items?: Array<{ serviceType: string; description?: string; amount: number }>;
};

type ResolvedServices =
  | { ok: true; serviceType: string; amount: number; items: JobItem[] | null }
  | { ok: false; error: string };

// A visit can be logged either as a single service (serviceType + amount) or as
// multiple line items. When items are present, the total amount and serviceType
// label are derived from them so wages/analytics stay consistent.
function resolveJobServices(input: ResolveServicesInput): ResolvedServices {
  if (input.items && input.items.length > 0) {
    const items: JobItem[] = input.items.map((it) => ({
      serviceType: it.serviceType,
      description: it.description ?? null,
      amount: it.amount,
    }));
    const amount = items.reduce((sum, it) => sum + it.amount, 0);
    const serviceType = items.length === 1 ? items[0].serviceType : "Multiple Services";
    return { ok: true, serviceType, amount, items };
  }
  if (input.serviceType == null || input.amount == null) {
    return { ok: false, error: "Either items or both serviceType and amount are required" };
  }
  return { ok: true, serviceType: input.serviceType, amount: input.amount, items: null };
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

  const wages = teamMembers * wageRate;
  const netIncome = amount - wages;
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

  // Recompute the monetary fields. If items are supplied, the total and label
  // are derived from them; otherwise fall back to an explicit amount/serviceType
  // (or the existing values when neither changed).
  let serviceType: string | undefined;
  let amount: number;
  let items: JobItem[] | null | undefined;
  if (parsed.data.items === null) {
    // Explicit collapse from multi-service back to a single service: clear the
    // stored items and use the supplied serviceType/amount (or existing values).
    serviceType = parsed.data.serviceType ?? existing[0].serviceType;
    amount = parsed.data.amount ?? parseFloat(existing[0].amount);
    items = null;
  } else if (parsed.data.items !== undefined) {
    const r = resolveJobServices({ items: parsed.data.items });
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    serviceType = r.serviceType;
    amount = r.amount;
    items = r.items;
  } else if (existing[0].items && existing[0].items.length > 0) {
    // Multi-service row being edited without resupplying items: keep the stored
    // items and always recompute the total/label from them. This prevents an
    // amount/serviceType-only update from desyncing the row (which would make
    // row.amount and the items[] breakdown disagree across reports).
    const stored = existing[0].items.map((it) => ({
      serviceType: it.serviceType,
      description: it.description ?? undefined,
      amount: it.amount,
    }));
    const r = resolveJobServices({ items: stored });
    serviceType = r.ok ? r.serviceType : existing[0].serviceType;
    amount = r.ok ? r.amount : parseFloat(existing[0].amount);
    items = undefined;
  } else {
    serviceType = parsed.data.serviceType;
    amount = parsed.data.amount ?? parseFloat(existing[0].amount);
    items = undefined;
  }
  const wages = teamMembers * wageRate;
  const netIncome = amount - wages;

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

  await logActivity(req.session.username!, "Deleted", "Job", params.data.id, `${row.serviceType} for ${row.clientName} on ${row.date}`);

  res.sendStatus(204);
});

export default router;
