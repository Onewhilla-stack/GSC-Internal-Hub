/**
 * Integration tests for DELETE /jobs/:id
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 */

import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { db, jobsTable, receiptsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import jobsRouter from "./jobs";

// ---------------------------------------------------------------------------
// Minimal test app — injects a director session so requireAuth +
// requireDirector both pass without a real session store.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).session = { userId: 1, username: "test-director", role: "director" };
    next();
  });
  app.use(jobsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers — insert minimal rows and collect their ids for cleanup
// ---------------------------------------------------------------------------
async function insertJob(): Promise<number> {
  const [row] = await db
    .insert(jobsTable)
    .values({
      clientName: "Test Client",
      date: "2024-06-01",
      serviceType: "Carpet Cleaning",
      amount: "5000.00",
      teamMembers: 2,
      wages: "2000.00",
      netIncome: "3000.00",
      createdBy: "test-director",
    })
    .returning({ id: jobsTable.id });
  return row.id;
}

async function insertReceipt(jobId: number | null, receiptNumber: string): Promise<number> {
  const [row] = await db
    .insert(receiptsTable)
    .values({
      receiptNumber,
      jobId,
      clientName: "Test Client",
      serviceType: "Carpet Cleaning",
      items: [{ serviceType: "Carpet Cleaning", description: null, amount: 5000 }],
      amount: "5000.00",
      date: "2024-06-01",
      paymentStatus: "Pending",
      createdBy: "test-director",
    })
    .returning({ id: receiptsTable.id });
  return row.id;
}

// ---------------------------------------------------------------------------
// Tracked ids — cleaned up in afterEach regardless of test outcome
// ---------------------------------------------------------------------------
let jobIds: number[] = [];
let receiptIds: number[] = [];

afterEach(async () => {
  if (receiptIds.length > 0) {
    await db.delete(receiptsTable).where(inArray(receiptsTable.id, receiptIds));
  }
  if (jobIds.length > 0) {
    await db.delete(jobsTable).where(inArray(jobsTable.id, jobIds));
  }
  jobIds = [];
  receiptIds = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DELETE /jobs/:id — receipt unlinking", () => {
  it("sets jobId to null on every linked receipt without removing the receipt rows", async () => {
    const app = buildApp();

    const jobId = await insertJob();
    jobIds.push(jobId);

    const rId1 = await insertReceipt(jobId, `TEST-RCT-DEL-001-${jobId}`);
    const rId2 = await insertReceipt(jobId, `TEST-RCT-DEL-002-${jobId}`);
    receiptIds.push(rId1, rId2);

    const res = await request(app).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(204);

    // The job must no longer exist.
    const remainingJobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId));
    expect(remainingJobs).toHaveLength(0);

    // Both receipts must still exist with their data intact …
    const receipts = await db
      .select()
      .from(receiptsTable)
      .where(inArray(receiptsTable.id, [rId1, rId2]));
    expect(receipts).toHaveLength(2);

    for (const receipt of receipts) {
      // … but the back-reference to the deleted job must be cleared.
      expect(receipt.jobId).toBeNull();
      // Financial data and identifier must be untouched.
      expect(receipt.clientName).toBe("Test Client");
      expect(receipt.serviceType).toBe("Carpet Cleaning");
      expect(parseFloat(receipt.amount)).toBe(5000);
      expect(receipt.items).toHaveLength(1);
    }
  });

  it("leaves receipts that reference OTHER jobs completely untouched", async () => {
    const app = buildApp();

    const jobToDelete = await insertJob();
    const unrelatedJob = await insertJob();
    jobIds.push(jobToDelete, unrelatedJob);

    const linkedReceiptId = await insertReceipt(jobToDelete, `TEST-RCT-DEL-003-${jobToDelete}`);
    const unrelatedReceiptId = await insertReceipt(unrelatedJob, `TEST-RCT-DEL-004-${unrelatedJob}`);
    receiptIds.push(linkedReceiptId, unrelatedReceiptId);

    const res = await request(app).delete(`/jobs/${jobToDelete}`);
    expect(res.status).toBe(204);

    const [unrelatedReceipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, unrelatedReceiptId));
    // The unrelated receipt must still point at its own job.
    expect(unrelatedReceipt.jobId).toBe(unrelatedJob);
  });
});

describe("DELETE /jobs/:id — no linked receipts", () => {
  it("deletes the job and returns 204 when no receipts reference it", async () => {
    const app = buildApp();

    const jobId = await insertJob();
    jobIds.push(jobId);

    const res = await request(app).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(204);

    const remaining = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId));
    expect(remaining).toHaveLength(0);
  });
});

describe("DELETE /jobs/:id — jobWasDeleted flag", () => {
  it("sets jobWasDeleted=true on every receipt that was linked to the deleted job", async () => {
    const app = buildApp();

    const jobId = await insertJob();
    jobIds.push(jobId);

    const rId1 = await insertReceipt(jobId, `TEST-RCT-DEL-005-${jobId}`);
    const rId2 = await insertReceipt(jobId, `TEST-RCT-DEL-006-${jobId}`);
    receiptIds.push(rId1, rId2);

    const res = await request(app).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(204);

    const receipts = await db
      .select()
      .from(receiptsTable)
      .where(inArray(receiptsTable.id, [rId1, rId2]));
    expect(receipts).toHaveLength(2);

    for (const receipt of receipts) {
      expect(receipt.jobWasDeleted).toBe(true);
    }
  });

  it("leaves jobWasDeleted=false on receipts that were never linked to any job", async () => {
    const app = buildApp();

    const jobId = await insertJob();
    jobIds.push(jobId);

    // Receipt with no job link at all (jobId = null from the start)
    const unlinkedReceiptId = await insertReceipt(null, `TEST-RCT-DEL-007-${jobId}`);
    receiptIds.push(unlinkedReceiptId);

    const res = await request(app).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(204);

    const [unlinkedReceipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, unlinkedReceiptId));
    expect(unlinkedReceipt.jobWasDeleted).toBe(false);
  });
});

describe("DELETE /jobs/:id — error cases", () => {
  it("returns 404 when the job does not exist", async () => {
    const app = buildApp();
    const res = await request(app).delete("/jobs/999999999");
    expect(res.status).toBe(404);
  });

  it("returns 401 when the request is not authenticated", async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, _res, next) => {
      (req as any).session = {};
      next();
    });
    unauthApp.use(jobsRouter);

    const jobId = await insertJob();
    jobIds.push(jobId);

    const res = await request(unauthApp).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(401);

    // Unauthenticated request must not delete the job.
    const remaining = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId));
    expect(remaining).toHaveLength(1);
  });

  it("returns 403 when the user is not a director", async () => {
    const workerApp = express();
    workerApp.use(express.json());
    workerApp.use((req, _res, next) => {
      (req as any).session = { userId: 2, username: "worker", role: "worker" };
      next();
    });
    workerApp.use(jobsRouter);

    const jobId = await insertJob();
    jobIds.push(jobId);

    const res = await request(workerApp).delete(`/jobs/${jobId}`);
    expect(res.status).toBe(403);

    const remaining = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, jobId));
    expect(remaining).toHaveLength(1);
  });
});
