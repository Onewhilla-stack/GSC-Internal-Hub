/**
 * Integration tests for DELETE /expenses/:id
 *
 * Audit finding: expenses currently have no linked child records, so no
 * unlinking step is required before deletion.  These tests document that
 * baseline and will need to be extended if linked data (attachments, receipt
 * imports, etc.) is introduced in the future.
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 */

import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { db, expensesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import expensesRouter from "./expenses";

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
  app.use(expensesRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers — insert a minimal expense row and collect its id for cleanup
// ---------------------------------------------------------------------------
async function insertExpense(): Promise<number> {
  const [row] = await db
    .insert(expensesTable)
    .values({
      date: "2024-06-01",
      category: "Supplies",
      description: "Test expense",
      amount: "1500.00",
      createdBy: "test-director",
    })
    .returning({ id: expensesTable.id });
  return row.id;
}

// ---------------------------------------------------------------------------
// Tracked ids — cleaned up in afterEach regardless of test outcome
// ---------------------------------------------------------------------------
let expenseIds: number[] = [];

afterEach(async () => {
  if (expenseIds.length > 0) {
    await db.delete(expensesTable).where(inArray(expensesTable.id, expenseIds));
  }
  expenseIds = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DELETE /expenses/:id — happy path (no linked data)", () => {
  it("deletes the expense and returns 204", async () => {
    const app = buildApp();

    const expenseId = await insertExpense();
    expenseIds.push(expenseId);

    const res = await request(app).delete(`/expenses/${expenseId}`);
    expect(res.status).toBe(204);

    const remaining = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expenseId));
    expect(remaining).toHaveLength(0);

    // Row was deleted so no cleanup needed for this id, but it is safe to
    // leave it in the list — the afterEach delete-where-in-array is a no-op
    // for ids that no longer exist.
  });

  it("deletes only the targeted expense and leaves all other expenses untouched", async () => {
    const app = buildApp();

    const targetId = await insertExpense();
    const unrelatedId = await insertExpense();
    expenseIds.push(targetId, unrelatedId);

    const res = await request(app).delete(`/expenses/${targetId}`);
    expect(res.status).toBe(204);

    const remaining = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, unrelatedId));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].description).toBe("Test expense");
  });
});

describe("DELETE /expenses/:id — error cases", () => {
  it("returns 404 when the expense does not exist", async () => {
    const app = buildApp();
    const res = await request(app).delete("/expenses/999999999");
    expect(res.status).toBe(404);
  });

  it("returns 401 when the request is not authenticated", async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use((req, _res, next) => {
      (req as any).session = {};
      next();
    });
    unauthApp.use(expensesRouter);

    const expenseId = await insertExpense();
    expenseIds.push(expenseId);

    const res = await request(unauthApp).delete(`/expenses/${expenseId}`);
    expect(res.status).toBe(401);

    // Unauthenticated request must not delete the expense.
    const remaining = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expenseId));
    expect(remaining).toHaveLength(1);
  });

  it("returns 403 when the user is not a director", async () => {
    const workerApp = express();
    workerApp.use(express.json());
    workerApp.use((req, _res, next) => {
      (req as any).session = { userId: 2, username: "worker", role: "worker" };
      next();
    });
    workerApp.use(expensesRouter);

    const expenseId = await insertExpense();
    expenseIds.push(expenseId);

    const res = await request(workerApp).delete(`/expenses/${expenseId}`);
    expect(res.status).toBe(403);

    const remaining = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expenseId));
    expect(remaining).toHaveLength(1);
  });
});
