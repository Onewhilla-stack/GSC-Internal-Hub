import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  clientCode: text("client_code").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  location: text("location"),
  status: text("status").notNull().default("New"),
  notes: text("notes"),
  firstVisitDate: text("first_visit_date"),
  createdBy: text("created_by"),
  lastEditedBy: text("last_edited_by"),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
