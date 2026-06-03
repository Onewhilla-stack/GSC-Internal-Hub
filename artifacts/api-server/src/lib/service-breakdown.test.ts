import { describe, it, expect } from "vitest";
import type { JobItem } from "@workspace/db";
import { aggregateRevenueByService, aggregateServiceCounts } from "./service-breakdown";

const MULTI_LABEL = "Multiple Services";

function item(serviceType: string, amount: number): JobItem {
  return { serviceType, amount };
}

describe("aggregateRevenueByService", () => {
  it("returns an empty array for empty input", () => {
    expect(aggregateRevenueByService([])).toEqual([]);
  });

  it("attributes revenue for single-service jobs using row serviceType and amount", () => {
    const result = aggregateRevenueByService([
      { serviceType: "Carpet Cleaning", amount: "1500.00", items: null },
      { serviceType: "Window Cleaning", amount: "500.50", items: null },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", revenue: 1500 },
      { serviceType: "Window Cleaning", revenue: 500.5 },
    ]);
  });

  it("expands multi-service visits, crediting each line item to its own service", () => {
    const result = aggregateRevenueByService([
      {
        serviceType: MULTI_LABEL,
        amount: "3000.00",
        items: [item("Carpet Cleaning", 2000), item("Window Cleaning", 1000)],
      },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", revenue: 2000 },
      { serviceType: "Window Cleaning", revenue: 1000 },
    ]);
  });

  it("combines revenue across single and multi-service rows and sorts descending", () => {
    const result = aggregateRevenueByService([
      { serviceType: "Carpet Cleaning", amount: "500.00", items: null },
      {
        serviceType: MULTI_LABEL,
        amount: "2500.00",
        items: [item("Carpet Cleaning", 1500), item("Deep Clean", 1000)],
      },
      { serviceType: "Window Cleaning", amount: "300.00", items: null },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", revenue: 2000 },
      { serviceType: "Deep Clean", revenue: 1000 },
      { serviceType: "Window Cleaning", revenue: 300 },
    ]);
  });

  it("never emits the 'Multiple Services' label in the output", () => {
    const result = aggregateRevenueByService([
      {
        serviceType: MULTI_LABEL,
        amount: "3000.00",
        items: [item("Carpet Cleaning", 2000), item("Window Cleaning", 1000)],
      },
      { serviceType: "Deep Clean", amount: "800.00", items: null },
    ]);
    expect(result.map((r) => r.serviceType)).not.toContain(MULTI_LABEL);
  });

  it("treats an empty items array as a single-service fallback", () => {
    const result = aggregateRevenueByService([
      { serviceType: "Carpet Cleaning", amount: "1200.00", items: [] },
    ]);
    expect(result).toEqual([{ serviceType: "Carpet Cleaning", revenue: 1200 }]);
  });
});

describe("aggregateServiceCounts", () => {
  it("returns an empty array for empty input", () => {
    expect(aggregateServiceCounts([])).toEqual([]);
  });

  it("counts single-service jobs by row serviceType", () => {
    const result = aggregateServiceCounts([
      { serviceType: "Carpet Cleaning", items: null },
      { serviceType: "Carpet Cleaning", items: null },
      { serviceType: "Window Cleaning", items: null },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", count: 2 },
      { serviceType: "Window Cleaning", count: 1 },
    ]);
  });

  it("expands multi-service visits, counting each line item once", () => {
    const result = aggregateServiceCounts([
      {
        serviceType: MULTI_LABEL,
        items: [item("Carpet Cleaning", 2000), item("Window Cleaning", 1000)],
      },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", count: 1 },
      { serviceType: "Window Cleaning", count: 1 },
    ]);
  });

  it("combines counts across single and multi-service rows and sorts descending", () => {
    const result = aggregateServiceCounts([
      { serviceType: "Carpet Cleaning", items: null },
      {
        serviceType: MULTI_LABEL,
        items: [item("Carpet Cleaning", 1500), item("Deep Clean", 1000)],
      },
      { serviceType: "Carpet Cleaning", items: null },
      { serviceType: "Window Cleaning", items: null },
    ]);
    expect(result).toEqual([
      { serviceType: "Carpet Cleaning", count: 3 },
      { serviceType: "Deep Clean", count: 1 },
      { serviceType: "Window Cleaning", count: 1 },
    ]);
  });

  it("never emits the 'Multiple Services' label in the output", () => {
    const result = aggregateServiceCounts([
      {
        serviceType: MULTI_LABEL,
        items: [item("Carpet Cleaning", 2000), item("Window Cleaning", 1000)],
      },
      { serviceType: "Deep Clean", items: null },
    ]);
    expect(result.map((r) => r.serviceType)).not.toContain(MULTI_LABEL);
  });

  it("treats an empty items array as a single-service fallback", () => {
    const result = aggregateServiceCounts([
      { serviceType: "Carpet Cleaning", items: [] },
    ]);
    expect(result).toEqual([{ serviceType: "Carpet Cleaning", count: 1 }]);
  });
});
