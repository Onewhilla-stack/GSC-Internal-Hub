/**
 * Integration tests for PATCH /jobs/:id — syncReceipts flow
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 *
 * Covered scenarios:
 *  1. Single-service update   — receipt items, serviceType, and amount all sync.
 *  2. Multi-service update    — receipt reflects multiple line items with the
 *                               "Multiple Services" label and summed total.
 *  3. Collapse back to single — a previously multi-service job is collapsed;
 *                               the receipt mirrors the single service.
 *  4. syncReceipts omitted    — receipt is NOT touched when the flag is absent.
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
async function insertSingleServiceJob(): Promise<number> {
  const [row] = await db
    .insert(jobsTable)
    .values({
      clientName: "Sync Test Client",
      date: "2024-06-01",
      serviceType: "Carpet Cleaning",
      amount: "5000.00",
      teamMembers: 2,
      wages: "2000.00",
      netIncome: "3000.00",
      items: null,
      createdBy: "test-director",
    })
    .returning({ id: jobsTable.id });
  return row.id;
}

async function insertMultiServiceJob(): Promise<number> {
  const [row] = await db
    .insert(jobsTable)
    .values({
      clientName: "Sync Test Client",
      date: "2024-06-01",
      serviceType: "Multiple Services",
      amount: "8000.00",
      teamMembers: 2,
      wages: "2000.00",
      netIncome: "6000.00",
      items: [
        { serviceType: "Carpet Cleaning", description: null, amount: 5000 },
        { serviceType: "Window Cleaning", description: null, amount: 3000 },
      ],
      createdBy: "test-director",
    })
    .returning({ id: jobsTable.id });
  return row.id;
}

async function insertReceipt(jobId: number, receiptNumber: string): Promise<number> {
  const [row] = await db
    .insert(receiptsTable)
    .values({
      receiptNumber,
      jobId,
      clientName: "Sync Test Client",
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

describe("PATCH /jobs/:id — syncReceipts: single-service update", () => {
  it("updates receipt items, serviceType, and amount to match the patched job", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-001-${jobId}`);
    receiptIds.push(receiptId);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        serviceType: "Floor Polishing",
        amount: 7500,
        syncReceipts: true,
      });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    // serviceType must reflect the new single service.
    expect(receipt.serviceType).toBe("Floor Polishing");
    // amount must match the patched value.
    expect(parseFloat(receipt.amount)).toBe(7500);
    // items array must contain exactly one entry matching the new service.
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items![0].serviceType).toBe("Floor Polishing");
    expect(receipt.items![0].amount).toBe(7500);
    // lastEditedBy must be stamped.
    expect(receipt.lastEditedBy).toBe("test-director");
  });

  it("syncs all linked receipts, not just the first one", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const rId1 = await insertReceipt(jobId, `TEST-RCT-SYNC-002a-${jobId}`);
    const rId2 = await insertReceipt(jobId, `TEST-RCT-SYNC-002b-${jobId}`);
    receiptIds.push(rId1, rId2);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({ serviceType: "Deep Clean", amount: 9000, syncReceipts: true });

    expect(res.status).toBe(200);

    const receipts = await db
      .select()
      .from(receiptsTable)
      .where(inArray(receiptsTable.id, [rId1, rId2]));

    for (const receipt of receipts) {
      expect(receipt.serviceType).toBe("Deep Clean");
      expect(parseFloat(receipt.amount)).toBe(9000);
      expect(receipt.items).toHaveLength(1);
      expect(receipt.items![0].serviceType).toBe("Deep Clean");
    }
  });
});

describe("PATCH /jobs/:id — syncReceipts: multi-service update", () => {
  it("sets receipt items to the full line-item list and labels serviceType 'Multiple Services'", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-003-${jobId}`);
    receiptIds.push(receiptId);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        items: [
          { serviceType: "Carpet Cleaning", amount: 4000 },
          { serviceType: "Upholstery Cleaning", amount: 2500 },
          { serviceType: "Window Cleaning", amount: 1500 },
        ],
        syncReceipts: true,
      });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    expect(receipt.serviceType).toBe("Multiple Services");
    // Total must equal the sum of all line items: 4000 + 2500 + 1500 = 8000.
    expect(parseFloat(receipt.amount)).toBe(8000);
    expect(receipt.items).toHaveLength(3);
    expect(receipt.items!.find((it) => it.serviceType === "Carpet Cleaning")?.amount).toBe(4000);
    expect(receipt.items!.find((it) => it.serviceType === "Upholstery Cleaning")?.amount).toBe(2500);
    expect(receipt.items!.find((it) => it.serviceType === "Window Cleaning")?.amount).toBe(1500);
  });

  it("uses 'Multiple Services' only when there are 2+ items (single-item array stays labelled)", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-004-${jobId}`);
    receiptIds.push(receiptId);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        items: [{ serviceType: "Specialized Clean", amount: 12000 }],
        syncReceipts: true,
      });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    expect(receipt.serviceType).toBe("Specialized Clean");
    expect(parseFloat(receipt.amount)).toBe(12000);
    expect(receipt.items).toHaveLength(1);
  });
});

describe("PATCH /jobs/:id — syncReceipts: collapse multi-service back to single", () => {
  it("receipt reflects collapsed single service when items: null is sent", async () => {
    const app = buildApp();

    const jobId = await insertMultiServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-005-${jobId}`);
    receiptIds.push(receiptId);

    // Collapse the multi-service job to a single service.
    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        items: null,
        serviceType: "General Cleaning",
        amount: 5500,
        syncReceipts: true,
      });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    expect(receipt.serviceType).toBe("General Cleaning");
    expect(parseFloat(receipt.amount)).toBe(5500);
    // After collapse the receipt must have exactly one item.
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items![0].serviceType).toBe("General Cleaning");
    expect(receipt.items![0].amount).toBe(5500);
  });
});

describe("PATCH /jobs/:id — syncReceipts omitted or false", () => {
  it("does NOT update the receipt when syncReceipts is omitted", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-006-${jobId}`);
    receiptIds.push(receiptId);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({ serviceType: "New Service", amount: 9999 });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    // Receipt must be completely unchanged.
    expect(receipt.serviceType).toBe("Carpet Cleaning");
    expect(parseFloat(receipt.amount)).toBe(5000);
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items![0].serviceType).toBe("Carpet Cleaning");
    expect(receipt.lastEditedBy).toBeNull();
  });

  it("does NOT update the receipt when syncReceipts is false", async () => {
    const app = buildApp();

    const jobId = await insertSingleServiceJob();
    jobIds.push(jobId);

    const receiptId = await insertReceipt(jobId, `TEST-RCT-SYNC-007-${jobId}`);
    receiptIds.push(receiptId);

    const res = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({ serviceType: "New Service", amount: 9999, syncReceipts: false });

    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptId));

    expect(receipt.serviceType).toBe("Carpet Cleaning");
    expect(parseFloat(receipt.amount)).toBe(5000);
    expect(receipt.lastEditedBy).toBeNull();
  });

  it("leaves receipts linked to OTHER jobs completely untouched during a synced PATCH", async () => {
    const app = buildApp();

    const jobA = await insertSingleServiceJob();
    const jobB = await insertSingleServiceJob();
    jobIds.push(jobA, jobB);

    const receiptA = await insertReceipt(jobA, `TEST-RCT-SYNC-008a-${jobA}`);
    const receiptB = await insertReceipt(jobB, `TEST-RCT-SYNC-008b-${jobB}`);
    receiptIds.push(receiptA, receiptB);

    // PATCH job A with syncReceipts.
    const res = await request(app)
      .patch(`/jobs/${jobA}`)
      .send({ serviceType: "Patched Service", amount: 6000, syncReceipts: true });

    expect(res.status).toBe(200);

    const [unrelated] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, receiptB));

    // Receipt B (linked to job B) must be untouched.
    expect(unrelated.serviceType).toBe("Carpet Cleaning");
    expect(parseFloat(unrelated.amount)).toBe(5000);
  });
});
