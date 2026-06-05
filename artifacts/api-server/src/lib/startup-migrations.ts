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

    logger.info("Startup migrations applied");
  } catch (err) {
    logger.error({ err }, "Startup migration failed");
    throw err;
  } finally {
    client.release();
  }
}
