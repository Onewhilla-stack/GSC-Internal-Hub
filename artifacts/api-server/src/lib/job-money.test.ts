import { describe, it, expect } from "vitest";
import {
  DEFAULT_WAGE_PER_PERSON_PER_DAY,
  resolveWageRate,
  calculateWages,
  calculateNetIncome,
  computeJobMoney,
} from "./job-money";

describe("resolveWageRate", () => {
  it("falls back to the default rate when no setting is configured", () => {
    expect(resolveWageRate(undefined)).toBe(DEFAULT_WAGE_PER_PERSON_PER_DAY);
    expect(resolveWageRate(null)).toBe(DEFAULT_WAGE_PER_PERSON_PER_DAY);
  });

  it("uses the configured rate from settings", () => {
    expect(resolveWageRate("1500")).toBe(1500);
    expect(resolveWageRate("1250.50")).toBe(1250.5);
  });

  it("falls back to the default when the stored value is unparseable", () => {
    expect(resolveWageRate("")).toBe(DEFAULT_WAGE_PER_PERSON_PER_DAY);
    expect(resolveWageRate("not-a-number")).toBe(DEFAULT_WAGE_PER_PERSON_PER_DAY);
  });
});

describe("calculateWages", () => {
  it("multiplies team size by the wage rate", () => {
    expect(calculateWages(1, 1000)).toBe(1000);
    expect(calculateWages(3, 1000)).toBe(3000);
    expect(calculateWages(5, 1200)).toBe(6000);
  });

  it("returns zero wages for a zero-person team", () => {
    expect(calculateWages(0, 1000)).toBe(0);
  });
});

describe("calculateNetIncome", () => {
  it("subtracts wages from the visit total", () => {
    expect(calculateNetIncome(5000, 2000)).toBe(3000);
  });

  it("can be negative when wages exceed the amount", () => {
    expect(calculateNetIncome(800, 1000)).toBe(-200);
  });
});

describe("computeJobMoney", () => {
  it("computes wages and net income with the default rate", () => {
    expect(
      computeJobMoney({
        teamMembers: 2,
        wageRate: DEFAULT_WAGE_PER_PERSON_PER_DAY,
        amount: 5000,
      }),
    ).toEqual({ wages: 2000, netIncome: 3000 });
  });

  it("uses a configured (non-default) rate from settings", () => {
    expect(
      computeJobMoney({ teamMembers: 3, wageRate: 1500, amount: 8000 }),
    ).toEqual({ wages: 4500, netIncome: 3500 });
  });

  it("scales wages with team size", () => {
    const single = computeJobMoney({ teamMembers: 1, wageRate: 1000, amount: 4000 });
    const triple = computeJobMoney({ teamMembers: 3, wageRate: 1000, amount: 4000 });
    expect(single.wages).toBe(1000);
    expect(triple.wages).toBe(3000);
    expect(single.netIncome).toBe(3000);
    expect(triple.netIncome).toBe(1000);
  });

  it("charges wages once for a multi-service visit, regardless of item count", () => {
    // A multi-service visit's amount is the sum of its line items, but wages are
    // a per-person daily cost — they must not multiply with the number of items.
    const items = [
      { serviceType: "Carpet Cleaning", amount: 2000 },
      { serviceType: "Window Cleaning", amount: 1000 },
      { serviceType: "Deep Clean", amount: 1500 },
    ];
    const amount = items.reduce((sum, it) => sum + it.amount, 0);

    const multiService = computeJobMoney({ teamMembers: 2, wageRate: 1000, amount });
    const singleServiceSameTotal = computeJobMoney({
      teamMembers: 2,
      wageRate: 1000,
      amount,
    });

    expect(multiService.wages).toBe(2000);
    expect(multiService.netIncome).toBe(2500);
    // Same team + same total => identical money math whether 1 service or many.
    expect(multiService).toEqual(singleServiceSameTotal);
  });
});
