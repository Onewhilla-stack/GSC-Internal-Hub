/**
 * Integration tests for DELETE /expenses/:id
 *
 * Audit finding: expenses currently have no linked child records, so no
 * unlinking step is required before deletion.  These tests document that
 * baseline and will need to be extended if linked data (attachments, receipt
 * imports, etc.) is introduced in the future.
 *
 * ## Pattern for future linked-table tests
 *
 * When a table with an `expenses.id` FK is added (e.g. `expense_attachments`):
 *
 *   1. Add the unlink step to the UNLINK SECTION in expenses.ts.
 *   2. Add a test here following this pattern:
 *
 *      it("deletes linked <child> rows before removing the expense", async () => {
 *        const app = buildApp();
 *        const expenseId = await insertExpense();
 *        expenseIds.push(expenseId);
 *
 *        // Insert a child row that references the expense.
 *        await db.insert(expenseAttachmentsTable).values({ expenseId, ... });
 *
 *        const res = await request(app).delete(`/expenses/${expenseId}`);
 *        expect(res.status).toBe(204);
 *
 *        // Child rows must be gone — no orphaned references.
 *        const orphans = await db.select().from(expenseAttachmentsTable)
 *          .where(eq(expenseAttachmentsTable.expenseId, expenseId));
 *        expect(orphans).toHaveLength(0);
 *
 *        // Parent must be gone too.
 *        const remaining = await db.select().from(expensesTable)
 *          .where(eq(expensesTable.id, expenseId));
 *        expect(remaining).toHaveLength(0);
 *      });
 *
 * These tests run against the real database (DATABASE_URL must be set).
 * Each test inserts its own rows and cleans them up in afterEach so the
 * suite is safe to run against a shared development DB.
 */

import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { db, expensesTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
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

// ---------------------------------------------------------------------------
// Schema guard — verifies the "no linked child tables" baseline is still true.
//
// This test queries the live database's information schema to confirm that no
// other table currently holds a foreign key referencing expenses.id.
//
// If this test fails after a schema change it means:
//   1. A new table references expenses.id as a FK.
//   2. The UNLINK SECTION in DELETE /expenses/:id has NOT been updated yet.
//   3. The delete handler must be updated (and a new test added below) before
//      this guard test is removed or the table name is added to any allowlist.
// ---------------------------------------------------------------------------

describe("DELETE /expenses/:id — schema guard (no unlinked child tables)", () => {
  it("no other table in the database has a foreign key referencing expenses.id", async () => {
    // Query pg_constraint to find every FK that points at the expenses table.
    // If any exist, the UNLINK SECTION in expenses.ts must be updated first.
    const result = await db.execute(sql`
      SELECT
        tc.table_name   AS child_table,
        kcu.column_name AS fk_column
      FROM information_schema.table_constraints    AS tc
      JOIN information_schema.key_column_usage     AS kcu
        ON  tc.constraint_name = kcu.constraint_name
        AND tc.table_schema    = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON  tc.constraint_name = rc.constraint_name
        AND tc.table_schema    = rc.constraint_schema
      JOIN information_schema.key_column_usage     AS ccu
        ON  rc.unique_constraint_name   = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name     = 'expenses'
        AND ccu.column_name    = 'id'
        AND tc.table_schema    = 'public'
    `);

    // drizzle-orm/node-postgres wraps the pg QueryResult — rows live in .rows.
    const fkRefs = (result.rows ?? result) as Array<{ child_table: string; fk_column: string }>;

    expect(
      fkRefs,
      [
        "One or more tables now reference expenses.id via a foreign key:",
        fkRefs.map((r) => `  ${r.child_table}.${r.fk_column}`).join("\n"),
        "",
        "Action required before this guard test passes:",
        "  1. Add an unlink step for each child table in the UNLINK SECTION of",
        "     artifacts/api-server/src/routes/expenses.ts",
        "  2. Add a corresponding test that verifies the unlink behaviour",
        "     (see the pattern at the top of this file).",
      ].join("\n"),
    ).toHaveLength(0);
  });
});
