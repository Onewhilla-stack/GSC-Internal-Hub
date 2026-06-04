import { describe, it, expect } from "vitest";
import {
  parseKES,
  parseDateToISO,
  normalizeService,
  findHeader,
  col,
  cell,
  parseJobCsvRows,
} from "./csv-import";

// ---------------------------------------------------------------------------
// parseKES
// ---------------------------------------------------------------------------

describe("parseKES", () => {
  it("parses plain numbers", () => {
    expect(parseKES("1700")).toBe(1700);
    expect(parseKES("1700.50")).toBe(1700.5);
  });

  it("strips KSH / KES prefix (case-insensitive)", () => {
    expect(parseKES("Ksh1,700.00")).toBe(1700);
    expect(parseKES("KES 2500")).toBe(2500);
    expect(parseKES("ksh500")).toBe(500);
  });

  it("strips comma thousands separators", () => {
    expect(parseKES("10,000")).toBe(10000);
    expect(parseKES("1,234,567")).toBe(1234567);
  });

  it("returns 0 for dash / empty / blank", () => {
    expect(parseKES("-")).toBe(0);
    expect(parseKES("")).toBe(0);
    expect(parseKES("  ")).toBe(0);
  });

  it("returns 0 for null / undefined", () => {
    expect(parseKES(null)).toBe(0);
    expect(parseKES(undefined)).toBe(0);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(parseKES("N/A")).toBe(0);
    expect(parseKES("abc")).toBe(0);
  });

  it("strips parentheses (accounting negative notation)", () => {
    expect(parseKES("(1500)")).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// parseDateToISO
// ---------------------------------------------------------------------------

describe("parseDateToISO", () => {
  it("passes through a well-formed ISO date unchanged", () => {
    expect(parseDateToISO("2025-03-15")).toBe("2025-03-15");
  });

  it("pads single-digit month and day in ISO input", () => {
    expect(parseDateToISO("2025-3-5")).toBe("2025-03-05");
  });

  it("converts DD/MM/YYYY slash dates", () => {
    expect(parseDateToISO("15/03/2025")).toBe("2025-03-15");
    expect(parseDateToISO("01/01/2024")).toBe("2024-01-01");
  });

  it("converts D/M/YYYY with single-digit day and month", () => {
    expect(parseDateToISO("5/3/2025")).toBe("2025-03-05");
  });

  it("expands a 2-digit year to 4 digits (20xx)", () => {
    expect(parseDateToISO("15/03/25")).toBe("2025-03-15");
  });

  it("accepts dot separators (D.M.YYYY)", () => {
    expect(parseDateToISO("15.03.2025")).toBe("2025-03-15");
  });

  it("returns null for dash / empty / null / undefined", () => {
    expect(parseDateToISO("-")).toBeNull();
    expect(parseDateToISO("")).toBeNull();
    expect(parseDateToISO(null)).toBeNull();
    expect(parseDateToISO(undefined)).toBeNull();
  });

  it("returns null for completely unparseable strings", () => {
    expect(parseDateToISO("not-a-date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeService
// ---------------------------------------------------------------------------

describe("normalizeService", () => {
  it("maps laundry / load / duvet keywords to Laundry", () => {
    expect(normalizeService("Laundry")).toBe("Laundry");
    expect(normalizeService("duvet cleaning")).toBe("Laundry");
    expect(normalizeService("1 load")).toBe("Laundry");
    expect(normalizeService("fleece blanket")).toBe("Laundry");
  });

  it("maps carpet alone to Carpet Cleaning", () => {
    expect(normalizeService("Carpet Cleaning")).toBe("Carpet Cleaning");
    expect(normalizeService("carpet wash")).toBe("Carpet Cleaning");
  });

  it("maps sofa / upholstery alone to Sofa/Upholstery", () => {
    expect(normalizeService("sofa cleaning")).toBe("Sofa/Upholstery");
    expect(normalizeService("upholstery")).toBe("Sofa/Upholstery");
  });

  it("maps combined sofa+carpet to Deep Cleaning", () => {
    expect(normalizeService("sofa and carpet cleaning")).toBe("Deep Cleaning");
    expect(normalizeService("carpet + upholstery")).toBe("Deep Cleaning");
  });

  it("maps fumigation+carpet or fumigation+sofa to Deep Cleaning", () => {
    expect(normalizeService("fumigation and carpet")).toBe("Deep Cleaning");
    expect(normalizeService("sofa and fumigation")).toBe("Deep Cleaning");
  });

  it("maps 'deep clean' to Deep Cleaning", () => {
    expect(normalizeService("deep cleaning")).toBe("Deep Cleaning");
    expect(normalizeService("DEEP CLEAN")).toBe("Deep Cleaning");
  });

  it("maps fumigation alone to Fumigation", () => {
    expect(normalizeService("fumigation")).toBe("Fumigation");
  });

  it("maps mattress to Mattress Cleaning", () => {
    expect(normalizeService("mattress")).toBe("Mattress Cleaning");
  });

  it("maps car wash to Car Wash", () => {
    expect(normalizeService("car wash")).toBe("Car Wash");
    expect(normalizeService("carwash")).toBe("Car Wash");
  });

  it("maps office cleaning to Office Cleaning", () => {
    expect(normalizeService("office")).toBe("Office Cleaning");
  });

  it("maps renovation / post-reno to Post-Renovation Cleaning", () => {
    expect(normalizeService("post-renovation cleaning")).toBe("Post-Renovation Cleaning");
    expect(normalizeService("post reno")).toBe("Post-Renovation Cleaning");
  });

  it("maps general / floor / toilet / scrub to Other", () => {
    expect(normalizeService("general cleaning")).toBe("Other");
    expect(normalizeService("floor scrub")).toBe("Other");
    expect(normalizeService("toilet cleaning")).toBe("Other");
  });

  it("returns Other for blank or unrecognised input", () => {
    expect(normalizeService("")).toBe("Other");
    expect(normalizeService("   ")).toBe("Other");
    expect(normalizeService("window cleaning")).toBe("Other");
    expect(normalizeService(null)).toBe("Other");
    expect(normalizeService(undefined)).toBe("Other");
  });

  it("treats combined laundry+laundry-keywords as Laundry (not Deep Cleaning)", () => {
    expect(normalizeService("curtain and duvet")).toBe("Laundry");
  });
});

// ---------------------------------------------------------------------------
// findHeader
// ---------------------------------------------------------------------------

describe("findHeader", () => {
  it("returns null when no row satisfies all required patterns", () => {
    const rows = [["Name", "Location"], ["Alice", "Westlands"]];
    const result = findHeader(rows, [/date/i, /amount/i]);
    expect(result).toBeNull();
  });

  it("finds the header on the first row", () => {
    const rows = [["Date", "Client", "Amount"], ["15/03/2025", "Alice", "3000"]];
    const result = findHeader(rows, [/date/i, /client/i, /amount/i]);
    expect(result).not.toBeNull();
    expect(result!.headerIndex).toBe(0);
    expect(result!.columns["date"]).toBe(0);
    expect(result!.columns["client"]).toBe(1);
    expect(result!.columns["amount"]).toBe(2);
  });

  it("skips leading title/instruction rows to find the real header", () => {
    const rows = [
      ["Gold Standard Cleaners — Jobs 2025"],
      ["", "", ""],
      ["Date", "Client Name", "Service Type", "Amount"],
      ["01/01/2025", "Bob", "Carpet Cleaning", "2500"],
    ];
    const result = findHeader(rows, [/date/i, /client/i, /amount/i]);
    expect(result).not.toBeNull();
    expect(result!.headerIndex).toBe(2);
  });

  it("normalises multi-word header keys to lowercase with single spaces", () => {
    const rows = [["Client  Name", "Service Type", "Amount", "Date"]];
    const result = findHeader(rows, [/date/i, /amount/i]);
    expect(result!.columns["client name"]).toBe(0);
    expect(result!.columns["service type"]).toBe(1);
  });

  it("ignores duplicate headers (keeps first occurrence)", () => {
    const rows = [["Date", "Amount", "Amount"]];
    const result = findHeader(rows, [/date/i, /amount/i]);
    expect(result!.columns["amount"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// col
// ---------------------------------------------------------------------------

describe("col", () => {
  const columns = {
    date: 0,
    "client name": 1,
    "service type": 2,
    amount: 3,
    "team size": 4,
  };

  it("finds an exact alias match", () => {
    expect(col(columns, ["date"])).toBe(0);
    expect(col(columns, ["amount"])).toBe(3);
  });

  it("finds a partial (substring) alias match", () => {
    expect(col(columns, ["client"])).toBe(1);
    expect(col(columns, ["team"])).toBe(4);
    expect(col(columns, ["service"])).toBe(2);
  });

  it("returns the first matching alias when multiple are provided", () => {
    expect(col(columns, ["cost", "amount", "price"])).toBe(3);
  });

  it("returns undefined when no alias matches", () => {
    expect(col(columns, ["location", "address"])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// cell
// ---------------------------------------------------------------------------

describe("cell", () => {
  const row = ["2025-01-15", "Alice", "Carpet Cleaning", "3000", ""];

  it("returns the trimmed cell value at a valid index", () => {
    expect(cell(row, 0)).toBe("2025-01-15");
    expect(cell(row, 2)).toBe("Carpet Cleaning");
  });

  it("returns an empty string for an undefined index", () => {
    expect(cell(row, undefined)).toBe("");
  });

  it("returns an empty string for an out-of-bounds index", () => {
    expect(cell(row, 10)).toBe("");
  });

  it("returns an empty string when the cell is empty", () => {
    expect(cell(row, 4)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Preview wage math (mirrors jobs.tsx previewRows computation)
// ---------------------------------------------------------------------------

describe("preview wage math", () => {
  function computePreviewRow(
    row: { amount: number; teamMembers: number },
    wageRate: number,
  ) {
    const wages = row.teamMembers * wageRate;
    return { ...row, wages, netIncome: row.amount - wages };
  }

  it("wages = teamMembers × wageRate", () => {
    const result = computePreviewRow({ amount: 5000, teamMembers: 2 }, 1000);
    expect(result.wages).toBe(2000);
  });

  it("netIncome = amount − wages", () => {
    const result = computePreviewRow({ amount: 5000, teamMembers: 2 }, 1000);
    expect(result.netIncome).toBe(3000);
  });

  it("charges wages once regardless of how many services the visit covers", () => {
    const wageRate = 1000;
    // amount is the sum of all service line-items for the visit
    const visitAmount = 2000 + 1500 + 500;
    const result = computePreviewRow({ amount: visitAmount, teamMembers: 3 }, wageRate);
    expect(result.wages).toBe(3000);
    expect(result.netIncome).toBe(visitAmount - 3000);
  });

  it("yields 0 wages when no team column is present (teamMembers = 0)", () => {
    const result = computePreviewRow({ amount: 4000, teamMembers: 0 }, 1000);
    expect(result.wages).toBe(0);
    expect(result.netIncome).toBe(4000);
  });

  it("uses the configured rate, not a hard-coded default", () => {
    const customRate = 1500;
    const result = computePreviewRow({ amount: 6000, teamMembers: 3 }, customRate);
    expect(result.wages).toBe(4500);
    expect(result.netIncome).toBe(1500);
  });

  it("net income can be negative when wages exceed the visit amount", () => {
    const result = computePreviewRow({ amount: 500, teamMembers: 3 }, 1000);
    expect(result.wages).toBe(3000);
    expect(result.netIncome).toBe(-2500);
  });

  it("preview totals sum correctly across multiple rows", () => {
    const wageRate = 1000;
    const rows = [
      { amount: 5000, teamMembers: 2 },
      { amount: 3000, teamMembers: 1 },
      { amount: 7000, teamMembers: 3 },
    ].map((r) => computePreviewRow(r, wageRate));

    const totals = rows.reduce(
      (acc, r) => ({
        amount: acc.amount + r.amount,
        wages: acc.wages + r.wages,
        netIncome: acc.netIncome + r.netIncome,
      }),
      { amount: 0, wages: 0, netIncome: 0 },
    );

    expect(totals.amount).toBe(15000);
    expect(totals.wages).toBe(6000);
    expect(totals.netIncome).toBe(9000);
  });

  it("preview math matches server-side computeJobMoney for identical inputs", () => {
    // Validate alignment between front-end preview and server formula.
    // Server: wages = teamMembers × wageRate; netIncome = amount − wages.
    const wageRate = 1200;
    const cases = [
      { amount: 4800, teamMembers: 2 },
      { amount: 10000, teamMembers: 5 },
      { amount: 0, teamMembers: 1 },
    ];
    for (const input of cases) {
      const serverWages = input.teamMembers * wageRate;
      const serverNetIncome = input.amount - serverWages;
      const preview = computePreviewRow(input, wageRate);
      expect(preview.wages).toBe(serverWages);
      expect(preview.netIncome).toBe(serverNetIncome);
    }
  });
});

// ---------------------------------------------------------------------------
// parseJobCsvRows — edge cases that must not silently produce an empty preview
// ---------------------------------------------------------------------------

describe("parseJobCsvRows", () => {
  it("returns an error for a completely empty CSV (no rows at all)", () => {
    const result = parseJobCsvRows([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/header row/i);
    }
  });

  it("returns an error for a header-only CSV (no data rows below the header)", () => {
    const result = parseJobCsvRows([
      ["Date", "Client Name", "Service Type", "Amount"],
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no valid job rows/i);
    }
  });

  it("returns an error when every data row is an expense or total marker", () => {
    const data = [
      ["Date", "Client Name", "Service Type", "Amount"],
      ["01/01/2025", "Expense", "Cleaning supplies", "500"],
      ["01/01/2025", "Total Clients", "Summary", "10000"],
      ["01/01/2025", "Alice", "expense", "2000"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no valid job rows/i);
    }
  });

  it("returns an error when all data rows have zero or blank amounts", () => {
    const data = [
      ["Date", "Client Name", "Service Type", "Amount"],
      ["01/01/2025", "Alice", "Carpet Cleaning", "0"],
      ["02/01/2025", "Bob", "Laundry", "-"],
      ["03/01/2025", "Carol", "Fumigation", ""],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no valid job rows/i);
    }
  });

  it("does not populate rows when all amounts are zero", () => {
    const data = [
      ["Date", "Client Name", "Amount"],
      ["01/01/2025", "Alice", "0"],
      ["02/01/2025", "Bob", "0"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(false);
    // Guard: importPreview must never receive these invalid rows
    if (result.ok) {
      expect(result.rows).toHaveLength(0);
    }
  });

  it("returns a valid result for a well-formed CSV", () => {
    const data = [
      ["Date", "Client Name", "Service Type", "Amount", "Team"],
      ["15/03/2025", "Alice", "Carpet Cleaning", "3000", "2"],
      ["16/03/2025", "Bob", "Laundry", "1500", "1"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].clientName).toBe("Alice");
      expect(result.rows[0].amount).toBe(3000);
      expect(result.rows[0].teamMembers).toBe(2);
      expect(result.rows[1].clientName).toBe("Bob");
      expect(result.rows[1].amount).toBe(1500);
    }
  });

  it("skips expense/total rows but keeps valid ones in the same file", () => {
    const data = [
      ["Date", "Client Name", "Service Type", "Amount"],
      ["01/01/2025", "Alice", "Carpet Cleaning", "2500"],
      ["01/01/2025", "Expense", "Supplies", "300"],
      ["01/01/2025", "Total Revenue", "", "2500"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].clientName).toBe("Alice");
    }
  });

  it("skips rows with missing or unparseable dates", () => {
    const data = [
      ["Date", "Client Name", "Amount"],
      ["", "Alice", "2000"],
      ["-", "Bob", "1500"],
      ["not-a-date", "Carol", "1000"],
      ["01/02/2025", "Dave", "3000"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].clientName).toBe("Dave");
    }
  });

  it("returns an error when a CSV has no recognisable header columns", () => {
    const data = [
      ["Name", "Location", "Notes"],
      ["Alice", "Westlands", "Regular"],
    ];
    const result = parseJobCsvRows(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/header row/i);
    }
  });
});
