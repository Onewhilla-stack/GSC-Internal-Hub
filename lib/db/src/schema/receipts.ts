import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface ReceiptItem {
  serviceType: string;
  description?: string | null;
  amount: number;
}

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  jobId: integer("job_id"),
  clientName: text("client_name").notNull(),
  serviceType: text("service_type").notNull(),
  description: text("description"),
  items: jsonb("items").$type<ReceiptItem[]>(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: text("date").notNull(),
  paymentStatus: text("payment_status").notNull().default("Pending"),
  notes: text("notes"),
  createdBy: text("created_by"),
  lastEditedBy: text("last_edited_by"),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({ id: true, createdAt: true });
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
