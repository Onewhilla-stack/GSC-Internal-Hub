import type { JobItem } from "@workspace/db";

type ServiceRevenueRow = {
  serviceType: string;
  amount: string;
  items: JobItem[] | null;
};

// Attributes revenue to each individual service. Multi-service visits store a
// "Multiple Services" label on the row, so we expand their line items and credit
// each item's amount to its own service. Single-service rows fall back to the
// row's serviceType + amount.
export function aggregateRevenueByService(
  rows: ServiceRevenueRow[],
): Array<{ serviceType: string; revenue: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.items && row.items.length > 0) {
      for (const item of row.items) {
        totals.set(item.serviceType, (totals.get(item.serviceType) ?? 0) + item.amount);
      }
    } else {
      totals.set(row.serviceType, (totals.get(row.serviceType) ?? 0) + parseFloat(row.amount));
    }
  }
  return [...totals.entries()]
    .map(([serviceType, revenue]) => ({ serviceType, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

type ServiceCountRow = {
  serviceType: string;
  items: JobItem[] | null;
};

// Counts how often each individual service occurs. Multi-service visits store a
// "Multiple Services" label on the row, so we expand their line items and count
// each item's service once. Single-service rows fall back to the row's
// serviceType. Returned sorted by count descending.
export function aggregateServiceCounts(
  rows: ServiceCountRow[],
): Array<{ serviceType: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.items && row.items.length > 0) {
      for (const item of row.items) {
        counts.set(item.serviceType, (counts.get(item.serviceType) ?? 0) + 1);
      }
    } else {
      counts.set(row.serviceType, (counts.get(row.serviceType) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([serviceType, count]) => ({ serviceType, count }))
    .sort((a, b) => b.count - a.count);
}
