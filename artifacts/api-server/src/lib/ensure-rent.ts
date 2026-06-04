import { db, expensesTable, settingsTable } from "@workspace/db";
import { and, eq, gte, lt } from "drizzle-orm";

const DEFAULT_RENT = 25000;

async function getMonthlyRent(): Promise<number> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "monthlyRent"));
  return row ? parseFloat(row.value) : DEFAULT_RENT;
}

export async function ensureMonthlyRentExpense(username: string): Promise<void> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonthStart.getFullYear()}-${String(nextMonthStart.getMonth() + 1).padStart(2, "0")}-01`;

  const existing = await db
    .select({ id: expensesTable.id })
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.category, "Rent"),
        gte(expensesTable.date, monthStart),
        lt(expensesTable.date, nextMonthStr)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  const amount = await getMonthlyRent();
  await db.insert(expensesTable).values({
    date: monthStart,
    category: "Rent",
    description: "Monthly Rent",
    amount: String(amount),
    createdBy: username,
  });
}
