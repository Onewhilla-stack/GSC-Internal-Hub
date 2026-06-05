/**
 * Integration tests for POST /jobs — auto-add client from visit
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 *
 * Covered scenarios:
 *  1. New client name      — a client row is auto-created and linked to the job.
 *  2. Case/whitespace variant — fuzzy match links to the existing client; no
 *                               duplicate client is created.
 *  3. Phone backfill       — when the matched client has no phone and the job
 *                            supplies one, the client's phone is updated.
 */

import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { db, jobsTable, clientsTable, activityLogTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import jobsRouter from "./jobs";

// ---------------------------------------------------------------------------
// Minimal test app — injects a director session so requireAuth passes.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: 1, username: "test-post-client", role: "director" };
    next();
  });
  app.use(jobsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// A minimal valid POST /jobs body.
// ---------------------------------------------------------------------------
function makeJobBody(clientName: string, extras: Record<string, unknown> = {}) {
  return {
    clientName,
    date: "2024-08-15",
    serviceType: "General Cleaning",
    amount: 4000,
    teamMembers: 2,
    ...extras,
  };
}

// ---------------------------------------------------------------------------
// Tracked ids — cleaned up in afterEach regardless of test outcome.
// ---------------------------------------------------------------------------
let jobIds: number[] = [];
let clientIds: number[] = [];

async function insertTestClient(name: string, code: string, phone: string | null = null): Promise<number> {
  const [row] = await db
    .insert(clientsTable)
    .values({
      clientCode: code,
      name,
      phone,
      status: "Active",
      createdBy: "test-post-client",
    })
    .returning({ id: clientsTable.id });
  clientIds.push(row.id);
  return row.id;
}

afterEach(async () => {
  if (jobIds.length > 0) {
    await db.delete(jobsTable).where(inArray(jobsTable.id, jobIds));
    jobIds = [];
  }
  if (clientIds.length > 0) {
    await db.delete(clientsTable).where(inArray(clientsTable.id, clientIds));
    clientIds = [];
  }
  await db.delete(activityLogTable).where(eq(activityLogTable.username, "test-post-client"));
});

// ---------------------------------------------------------------------------
// Helper — post a job and return the response.
// ---------------------------------------------------------------------------
async function postJob(app: ReturnType<typeof buildApp>, body: ReturnType<typeof makeJobBody>) {
  return request(app).post("/jobs").send(body);
}

// ---------------------------------------------------------------------------
// Helper — fetch all clients whose name matches (case-insensitive).
// ---------------------------------------------------------------------------
async function fetchClientsByName(name: string): Promise<typeof clientsTable.$inferSelect[]> {
  return db
    .select()
    .from(clientsTable)
    .where(sql`lower(trim(${clientsTable.name})) = lower(${name.trim()})`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /jobs — auto-add client: new client name", () => {
  it("creates a client row and links the job to it", async () => {
    const app = buildApp();
    const clientName = "Waweru Interiors XYZ9";

    const before = await fetchClientsByName(clientName);
    expect(before).toHaveLength(0);

    const res = await postJob(app, makeJobBody(clientName));
    expect(res.status).toBe(201);

    const jobId: number = res.body.id;
    jobIds.push(jobId);

    // A client row must have been auto-created.
    const after = await fetchClientsByName(clientName);
    expect(after).toHaveLength(1);
    const newClient = after[0];
    clientIds.push(newClient.id);

    // The job must be linked to the newly created client.
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    expect(job.clientId).toBe(newClient.id);

    // An activity log entry must exist for the auto-created client.
    const logs = await db
      .select()
      .from(activityLogTable)
      .where(
        sql`${activityLogTable.username} = 'test-post-client'
          AND ${activityLogTable.recordType} = 'Client'
          AND ${activityLogTable.recordId} = ${newClient.id}`,
      );
    expect(logs).toHaveLength(1);
    expect(logs[0].details).toContain("auto-added from visit");
  });
});

describe("POST /jobs — auto-add client: case/whitespace variant matches existing", () => {
  it("links to the existing client and creates no duplicate", async () => {
    const app = buildApp();
    const existingId = await insertTestClient("Njoroge Facilities", "TEST-CLI-POST-001");

    // Send with different casing and surrounding whitespace.
    const res = await postJob(app, makeJobBody("  NJOROGE FACILITIES  "));
    expect(res.status).toBe(201);

    const jobId: number = res.body.id;
    jobIds.push(jobId);

    // The job must point at the pre-existing client.
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    expect(job.clientId).toBe(existingId);

    // No duplicate client must exist.
    const allMatching = await fetchClientsByName("Njoroge Facilities");
    expect(allMatching).toHaveLength(1);
    expect(allMatching[0].id).toBe(existingId);
  });
});

describe("POST /jobs — auto-add client: phone backfill on match", () => {
  it("updates the matched client's phone when the client had none", async () => {
    const app = buildApp();
    // Pre-insert a client with no phone.
    const existingId = await insertTestClient("Achieng Services", "TEST-CLI-POST-002", null);

    const res = await postJob(
      app,
      makeJobBody("Achieng Services", { clientPhone: "0712345678" }),
    );
    expect(res.status).toBe(201);

    const jobId: number = res.body.id;
    jobIds.push(jobId);

    // The job must be linked to the existing client.
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    expect(job.clientId).toBe(existingId);

    // The client's phone must now be set to the value supplied in the job.
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, existingId));
    expect(client.phone).toBe("0712345678");

    // Still only one client record.
    const allMatching = await fetchClientsByName("Achieng Services");
    expect(allMatching).toHaveLength(1);
  });
});
