import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface JobItem {
  serviceType: string;
  description?: string | null;
  amount: number;
}

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  serviceType: text("service_type").notNull(),
  description: text("description"),
  location: text("location"),
  items: jsonb("items").$type<JobItem[]>(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  teamMembers: integer("team_members").notNull().default(1),
  wages: numeric("wages", { precision: 12, scale: 2 }).notNull(),
  netIncome: numeric("net_income", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  lastEditedBy: text("last_edited_by"),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
