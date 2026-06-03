import { describe, it, expect } from "vitest";
import type { JobItem } from "@workspace/db";
import {
  MULTIPLE_SERVICES_LABEL,
  resolveJobServices,
  resolveJobUpdateServices,
  type ExistingJobServices,
} from "./job-services";

function item(serviceType: string, amount: number, description?: string): JobItem {
  return { serviceType, amount, description: description ?? null };
}

describe("resolveJobServices", () => {
  it("resolves a single service from serviceType + amount (no items column)", () => {
    const result = resolveJobServices({ serviceType: "Carpet Cleaning", amount: 1500 });
    expect(result).toEqual({
      ok: true,
      serviceType: "Carpet Cleaning",
      amount: 1500,
      items: null,
    });
  });

  it("sums line items and labels a multi-service visit 'Multiple Services'", () => {
    const result = resolveJobServices({
      items: [
        { serviceType: "Carpet Cleaning", amount: 2000 },
        { serviceType: "Window Cleaning", amount: 1000, description: "All floors" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.serviceType).toBe(MULTIPLE_SERVICES_LABEL);
    expect(result.amount).toBe(3000);
    expect(result.items).toEqual([
      item("Carpet Cleaning", 2000),
      item("Window Cleaning", 1000, "All floors"),
    ]);
  });

  it("normalizes a missing description to null on each item", () => {
    const result = resolveJobServices({
      items: [{ serviceType: "Deep Clean", amount: 500 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toEqual([{ serviceType: "Deep Clean", description: null, amount: 500 }]);
  });

  it("collapses a single-item array to that item's label, not 'Multiple Services'", () => {
    const result = resolveJobServices({
      items: [{ serviceType: "Deep Clean", amount: 4200 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.serviceType).toBe("Deep Clean");
    expect(result.amount).toBe(4200);
    expect(result.items).toEqual([item("Deep Clean", 4200)]);
  });

  it("prefers items over a stray serviceType/amount when both are supplied", () => {
    const result = resolveJobServices({
      serviceType: "Ignored",
      amount: 99,
      items: [
        { serviceType: "Carpet Cleaning", amount: 2000 },
        { serviceType: "Window Cleaning", amount: 1000 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.serviceType).toBe(MULTIPLE_SERVICES_LABEL);
    expect(result.amount).toBe(3000);
  });

  it("errors when neither items nor a serviceType + amount pair is supplied", () => {
    expect(resolveJobServices({})).toEqual({
      ok: false,
      error: "Either items or both serviceType and amount are required",
    });
  });

  it("errors when only serviceType is supplied (amount missing)", () => {
    expect(resolveJobServices({ serviceType: "Carpet Cleaning" })).toEqual({
      ok: false,
      error: "Either items or both serviceType and amount are required",
    });
  });

  it("errors when only amount is supplied (serviceType missing)", () => {
    expect(resolveJobServices({ amount: 1500 })).toEqual({
      ok: false,
      error: "Either items or both serviceType and amount are required",
    });
  });

  it("treats an empty items array as the missing-input error case", () => {
    expect(resolveJobServices({ items: [] })).toEqual({
      ok: false,
      error: "Either items or both serviceType and amount are required",
    });
  });

  it("allows a zero amount on a single service", () => {
    const result = resolveJobServices({ serviceType: "Carpet Cleaning", amount: 0 });
    expect(result).toEqual({ ok: true, serviceType: "Carpet Cleaning", amount: 0, items: null });
  });
});

describe("resolveJobUpdateServices", () => {
  const singleExisting: ExistingJobServices = {
    serviceType: "Carpet Cleaning",
    amount: 1500,
    items: null,
  };
  const multiExisting: ExistingJobServices = {
    serviceType: MULTIPLE_SERVICES_LABEL,
    amount: 3000,
    items: [item("Carpet Cleaning", 2000), item("Window Cleaning", 1000)],
  };

  describe("items supplied (replace)", () => {
    it("replaces with the supplied line items and derives total + label", () => {
      const result = resolveJobUpdateServices(
        {
          items: [
            { serviceType: "Deep Clean", amount: 2500 },
            { serviceType: "Window Cleaning", amount: 800 },
          ],
        },
        singleExisting,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.serviceType).toBe(MULTIPLE_SERVICES_LABEL);
      expect(result.amount).toBe(3300);
      expect(result.items).toEqual([
        item("Deep Clean", 2500),
        item("Window Cleaning", 800),
      ]);
    });

    it("replacing with a single-item array collapses to that service label", () => {
      const result = resolveJobUpdateServices(
        { items: [{ serviceType: "Deep Clean", amount: 900 }] },
        multiExisting,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.serviceType).toBe("Deep Clean");
      expect(result.amount).toBe(900);
      expect(result.items).toEqual([item("Deep Clean", 900)]);
    });

    it("errors when an empty items array is supplied for replacement", () => {
      expect(resolveJobUpdateServices({ items: [] }, multiExisting)).toEqual({
        ok: false,
        error: "Either items or both serviceType and amount are required",
      });
    });
  });

  describe("items omitted (keep)", () => {
    it("keeps stored multi-service items and recomputes total + label from them", () => {
      const result = resolveJobUpdateServices(
        { serviceType: "Trying to override", amount: 99999 },
        multiExisting,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // The amount/serviceType override is ignored: a multi-service row stays in
      // sync with its stored items so reports never disagree with the breakdown.
      expect(result.serviceType).toBe(MULTIPLE_SERVICES_LABEL);
      expect(result.amount).toBe(3000);
      // items === undefined => leave the stored items column untouched.
      expect(result.items).toBeUndefined();
    });

    it("for a single-service row, applies the supplied serviceType + amount", () => {
      const result = resolveJobUpdateServices(
        { serviceType: "Deep Clean", amount: 4000 },
        singleExisting,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.serviceType).toBe("Deep Clean");
      expect(result.amount).toBe(4000);
      expect(result.items).toBeUndefined();
    });

    it("for a single-service row, falls back to the existing amount when none supplied", () => {
      const result = resolveJobUpdateServices({ serviceType: "Deep Clean" }, singleExisting);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.serviceType).toBe("Deep Clean");
      expect(result.amount).toBe(1500);
      expect(result.items).toBeUndefined();
    });

    it("treats an existing empty items array as a single-service row", () => {
      const result = resolveJobUpdateServices(
        { serviceType: "Deep Clean", amount: 2200 },
        { serviceType: "Carpet Cleaning", amount: 1500, items: [] },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.serviceType).toBe("Deep Clean");
      expect(result.amount).toBe(2200);
      expect(result.items).toBeUndefined();
    });
  });

  describe("items === null (collapse)", () => {
    it("collapses a multi-service row to the supplied single serviceType + amount", () => {
      const result = resolveJobUpdateServices(
        { items: null, serviceType: "Deep Clean", amount: 1800 },
        multiExisting,
      );
      expect(result).toEqual({
        ok: true,
        serviceType: "Deep Clean",
        amount: 1800,
        items: null,
      });
    });

    it("falls back to the existing serviceType + amount when none supplied", () => {
      const result = resolveJobUpdateServices({ items: null }, multiExisting);
      expect(result).toEqual({
        ok: true,
        serviceType: MULTIPLE_SERVICES_LABEL,
        amount: 3000,
        items: null,
      });
    });

    it("uses a supplied serviceType but the existing amount when only one is given", () => {
      const result = resolveJobUpdateServices(
        { items: null, serviceType: "Deep Clean" },
        multiExisting,
      );
      expect(result).toEqual({
        ok: true,
        serviceType: "Deep Clean",
        amount: 3000,
        items: null,
      });
    });
  });
});
