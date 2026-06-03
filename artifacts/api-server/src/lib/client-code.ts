import { db, clientsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function nextClientCodeNumber(): Promise<number> {
  const [row] = await db.select({
    max: sql<number>`COALESCE(MAX(CAST(NULLIF(regexp_replace(${clientsTable.clientCode}, '\\D', '', 'g'), '') AS INTEGER)), 0)`,
  }).from(clientsTable);
  return (row?.max ?? 0) + 1;
}

export function formatClientCode(num: number): string {
  return `GSC-${String(num).padStart(3, "0")}`;
}

export async function generateClientCode(): Promise<string> {
  return formatClientCode(await nextClientCodeNumber());
}
