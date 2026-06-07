/**
 * Integration tests for POST /jobs/import — client deduplication
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 *
 * Covered scenarios:
 *  1. Exact name match       — import row links to existing client, no duplicate created.
 *  2. Uppercase variant      — case-folded match links to existing client.
 *  3. Lowercase variant      — case-folded match links to existing client.
 *  4. Surrounding whitespace — trimmed match links to existing client.
 *  5. Multiple rows, same variant — all rows share the one existing client.
 *  6. Unknown name           — a genuinely new client is auto-created.
 *  7. Blank client name      — job is inserted with no clientId (no crash).
 */

import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { db, jobsTable, clientsTable, activityLogTable } from "@workspace/db";
import { eq, inArray, and, sql } from "drizzle-orm";
import jobsRouter from "./jobs";

// ---------------------------------------------------------------------------
// Minimal test app — injects a director session so requireAuth passes.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: 1, username: "test-import", role: "director" };
    next();
  });
  app.use(jobsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// A minimal valid import row (all required fields).
// ---------------------------------------------------------------------------
function makeRow(clientName: string) {
  return {
    clientName,
    date: "2024-07-01",
    serviceType: "Carpet Cleaning",
    amount: 5000,
    teamMembers: 2,
  };
}

// ---------------------------------------------------------------------------
// Tracked ids — cleaned up in afterEach regardless of test outcome.
// ---------------------------------------------------------------------------
let jobIds: number[] = [];
let clientIds: number[] = [];

async function insertTestClient(name: string, code: string): Promise<number> {
  const [row] = await db
    .insert(clientsTable)
    .values({
      clientCode: code,
      name,
      status: "Active",
      createdBy: "test-import",
    })
    .returning({ id: clientsTable.id });
  clientIds.push(row.id);
  return row.id;
}

afterEach(async () => {
  // Delete jobs first (foreign-key safe order).
  if (jobIds.length > 0) {
    await db.delete(jobsTable).where(inArray(jobsTable.id, jobIds));
    jobIds = [];
  }
  // Clean up any clients created during the test (pre-inserted or auto-created).
  if (clientIds.length > 0) {
    await db.delete(clientsTable).where(inArray(clientsTable.id, clientIds));
    clientIds = [];
  }
  // Remove activity log entries written by the import handler for our test user.
  await db.delete(activityLogTable).where(eq(activityLogTable.username, "test-import"));
});

// ---------------------------------------------------------------------------
// Helper — collect job ids from a successful import response so they can be
// cleaned up, then return the inserted job rows for assertions.
// ---------------------------------------------------------------------------
async function importRows(app: ReturnType<typeof buildApp>, rows: ReturnType<typeof makeRow>[]) {
  const res = await request(app)
    .post("/jobs/import")
    .send({ rows });
  return res;
}

async function fetchJobsForCleanup(clientName: string, date: string): Promise<number[]> {
  const rows = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(
      and(
        sql`lower(trim(${jobsTable.clientName})) = lower(${clientName.trim()})`,
        eq(jobsTable.date, date),
        eq(jobsTable.createdBy, "test-import"),
      ),
    );
  return rows.map((r) => r.id);
}

async function fetchClientsByName(name: string): Promise<typeof clientsTable.$inferSelect[]> {
  return db
    .select()
    .from(clientsTable)
    .where(sql`lower(trim(${clientsTable.name})) = lower(${name.trim()})`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /jobs/import — client deduplication: exact name match", () => {
  it("links the job to the existing client instead of creating a duplicate", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Wanjiru Holdings", "TEST-CLI-IMP-001");

    const res = await importRows(app, [makeRow("Wanjiru Holdings")]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.errors).toBe(0);

    // Collect inserted job ids for cleanup.
    const inserted = await fetchJobsForCleanup("Wanjiru Holdings", "2024-07-01");
    jobIds.push(...inserted);
    expect(inserted).toHaveLength(1);

    // The job must point at the pre-existing client.
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, inserted[0]));
    expect(job.clientId).toBe(existingId);

    // No duplicate client record must have been created.
    const allMatching = await fetchClientsByName("Wanjiru Holdings");
    expect(allMatching).toHaveLength(1);
    expect(allMatching[0].id).toBe(existingId);
  });
});

describe("POST /jobs/import — client deduplication: uppercase variant", () => {
  it("matches the existing client even when the import name is all-uppercase", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Muthoni Supplies", "TEST-CLI-IMP-002");

    const res = await importRows(app, [makeRow("MUTHONI SUPPLIES")]);
    expect(res.status).toBe(200);

    const inserted = await fetchJobsForCleanup("MUTHONI SUPPLIES", "2024-07-01");
    jobIds.push(...inserted);

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, inserted[0]));
    expect(job.clientId).toBe(existingId);

    const allMatching = await fetchClientsByName("Muthoni Supplies");
    expect(allMatching).toHaveLength(1);
  });
});

describe("POST /jobs/import — client deduplication: lowercase variant", () => {
  it("matches the existing client even when the import name is all-lowercase", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Otieno Enterprises", "TEST-CLI-IMP-003");

    const res = await importRows(app, [makeRow("otieno enterprises")]);
    expect(res.status).toBe(200);

    const inserted = await fetchJobsForCleanup("otieno enterprises", "2024-07-01");
    jobIds.push(...inserted);

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, inserted[0]));
    expect(job.clientId).toBe(existingId);

    const allMatching = await fetchClientsByName("Otieno Enterprises");
    expect(allMatching).toHaveLength(1);
  });
});

describe("POST /jobs/import — client deduplication: surrounding whitespace", () => {
  it("matches the existing client when the import name has leading/trailing spaces", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Kamau & Sons", "TEST-CLI-IMP-004");

    const res = await importRows(app, [makeRow("  Kamau & Sons  ")]);
    expect(res.status).toBe(200);

    const inserted = await fetchJobsForCleanup("Kamau & Sons", "2024-07-01");
    jobIds.push(...inserted);

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, inserted[0]));
    expect(job.clientId).toBe(existingId);

    const allMatching = await fetchClientsByName("Kamau & Sons");
    expect(allMatching).toHaveLength(1);
  });
});

describe("POST /jobs/import — client deduplication: multiple rows with name variants", () => {
  it("all rows share the single existing client regardless of casing used per row", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Njeri Cleaning Co", "TEST-CLI-IMP-005");

    const rows = [
      makeRow("Njeri Cleaning Co"),
      makeRow("NJERI CLEANING CO"),
      makeRow("njeri cleaning co"),
      makeRow("  Njeri Cleaning Co  "),
    ];

    const res = await importRows(app, rows);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(4);

    // Collect all inserted jobs for cleanup.
    const inserted = await db
      .select({ id: jobsTable.id, clientId: jobsTable.clientId })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.date, "2024-07-01"),
          eq(jobsTable.createdBy, "test-import"),
          eq(jobsTable.serviceType, "Carpet Cleaning"),
        ),
      );
    // Filter to only jobs that could be ours (there may be leftovers from
    // other tests if parallelism happens, though afterEach prevents that).
    const ours = inserted.filter((j) => j.clientId === existingId);
    jobIds.push(...ours.map((j) => j.id));
    expect(ours).toHaveLength(4);

    // Every imported job must point at the single pre-existing client.
    for (const job of ours) {
      expect(job.clientId).toBe(existingId);
    }

    // Still only one client record for this name.
    const allMatching = await fetchClientsByName("Njeri Cleaning Co");
    expect(allMatching).toHaveLength(1);
    expect(allMatching[0].id).toBe(existingId);
  });
});

describe("POST /jobs/import — client deduplication: new client name", () => {
  it("auto-creates a client record when no existing client matches", async () => {
    const app = buildApp();

    const beforeCount = (await fetchClientsByName("Totally New Client XYZ9")).length;
    expect(beforeCount).toBe(0);

    const res = await importRows(app, [makeRow("Totally New Client XYZ9")]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    const allMatching = await fetchClientsByName("Totally New Client XYZ9");
    expect(allMatching).toHaveLength(1);

    // Track both the job and the newly auto-created client for cleanup.
    const newClient = allMatching[0];
    clientIds.push(newClient.id);

    const inserted = await fetchJobsForCleanup("Totally New Client XYZ9", "2024-07-01");
    jobIds.push(...inserted);

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, inserted[0]));
    expect(job.clientId).toBe(newClient.id);
  });
});

describe("POST /jobs/import — client deduplication: two sequential import batches", () => {
  it("creates only one client when the same name arrives in two separate imports with different casing", async () => {
    const app = buildApp();

    // Use a timestamp-embedded name that is guaranteed not to exist in the DB
    // beforehand, so the assertions and cleanup are deterministic and safe.
    const uniqueName = `TwoBatch-${Date.now()}`;
    const lowerName = uniqueName.toLowerCase();

    // Verify the name truly doesn't exist yet (sanity-check for isolation).
    const beforeCount = (await fetchClientsByName(uniqueName)).length;
    expect(beforeCount).toBe(0);

    // ── First batch ──────────────────────────────────────────────────────────
    // The handler must auto-create a new client for this previously-unknown name.
    const res1 = await request(app)
      .post("/jobs/import")
      .send({ rows: [{ clientName: uniqueName, date: "2024-08-01", serviceType: "Carpet Cleaning", amount: 3000, teamMembers: 1 }] });
    expect(res1.status).toBe(200);
    expect(res1.body.imported).toBe(1);
    expect(res1.body.errors).toBe(0);

    // Exactly one client must now exist for this unique name.
    const clientsAfterFirst = await fetchClientsByName(uniqueName);
    expect(clientsAfterFirst).toHaveLength(1);
    const clientId = clientsAfterFirst[0].id;
    // Register for cleanup — this client was created by this test.
    clientIds.push(clientId);

    const jobsAfterFirst = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.clientId, clientId),
          eq(jobsTable.date, "2024-08-01"),
          eq(jobsTable.createdBy, "test-import"),
        ),
      );
    expect(jobsAfterFirst).toHaveLength(1);
    jobIds.push(jobsAfterFirst[0].id);

    // ── Second batch ─────────────────────────────────────────────────────────
    // The lowercase variant must match the existing client, not create a second one.
    const res2 = await request(app)
      .post("/jobs/import")
      .send({ rows: [{ clientName: lowerName, date: "2024-08-02", serviceType: "Carpet Cleaning", amount: 4000, teamMembers: 1 }] });
    expect(res2.status).toBe(200);
    expect(res2.body.imported).toBe(1);
    expect(res2.body.errors).toBe(0);

    // Still exactly one client row for this unique name — no duplicate was created.
    const clientsAfterSecond = await fetchClientsByName(uniqueName);
    expect(clientsAfterSecond).toHaveLength(1);
    expect(clientsAfterSecond[0].id).toBe(clientId);

    // Both imported jobs must carry the same clientId.
    const allJobs = await db
      .select({ id: jobsTable.id, clientId: jobsTable.clientId })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.clientId, clientId),
          eq(jobsTable.createdBy, "test-import"),
        ),
      );
    expect(allJobs).toHaveLength(2);
    for (const job of allJobs) {
      expect(job.clientId).toBe(clientId);
    }
    // Track the second job id for cleanup.
    const secondId = allJobs.find((j) => !jobIds.includes(j.id))?.id;
    if (secondId != null) jobIds.push(secondId);
  });
});

describe("POST /jobs/import — client deduplication: blank client name", () => {
  it("inserts the job with no clientId when the client name is blank", async () => {
    const app = buildApp();

    const res = await importRows(app, [makeRow("")]);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    const inserted = await db
      .select({ id: jobsTable.id, clientId: jobsTable.clientId })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.clientName, ""),
          eq(jobsTable.date, "2024-07-01"),
          eq(jobsTable.createdBy, "test-import"),
        ),
      );
    jobIds.push(...inserted.map((r) => r.id));

    expect(inserted).toHaveLength(1);
    expect(inserted[0].clientId).toBeNull();
  });
});
