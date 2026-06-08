import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Lightweight startup migrations — applied with IF NOT EXISTS / IF EXISTS guards
 * so they are safe to run on every server boot against both dev and production.
 *
 * Add new columns/tables here rather than relying on `drizzle-kit push` which
 * requires an interactive TTY and is blocked in CI / non-interactive shells.
 */
export async function runStartupMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Added by Task #34 (receipt-warning feature): flag set when the linked job
    // is deleted so the receipt UI can show a warning banner.
    await client.query(`
      ALTER TABLE receipts
        ADD COLUMN IF NOT EXISTS job_was_deleted boolean NOT NULL DEFAULT false
    `);

    // Added by Task #80 (Quotation Generator): stores client quotations with
    // GSC-QTN-NNN numbering, line items (JSONB), and Pending/Accepted/Declined status.
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id          serial PRIMARY KEY,
        quotation_number text NOT NULL UNIQUE,
        client_name text NOT NULL,
        location    text,
        date        text NOT NULL,
        expiry_date text,
        status      text NOT NULL DEFAULT 'Pending',
        items       jsonb NOT NULL DEFAULT '[]',
        amount      numeric(12,2) NOT NULL,
        notes       text,
        created_by  text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    logger.info("Startup migrations applied");
  } catch (err) {
    logger.error({ err }, "Startup migration failed");
    throw err;
  } finally {
    client.release();
  }
}
