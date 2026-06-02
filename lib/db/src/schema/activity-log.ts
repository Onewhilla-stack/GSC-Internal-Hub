import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  username: text("username").notNull(),
  action: text("action").notNull(),
  recordType: text("record_type").notNull(),
  recordId: integer("record_id"),
  details: text("details").notNull(),
});

export type ActivityLog = typeof activityLogTable.$inferSelect;
