// Shared helpers for parsing the cleaning company's real-world CSV exports.
// Handles "Ksh1,700.00" / "1,700" / "-" amounts, DD/MM/YYYY dates,
// service-name normalization, and locating the header row in sheets that
// have title/instruction rows before the real header.

export function parseKES(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  if (s === "" || s === "-") return 0;
  const cleaned = s.replace(/ksh|kes/gi, "").replace(/[,\s]/g, "").replace(/[()]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Normalize a date string to ISO YYYY-MM-DD. Assumes DD/MM/YYYY for slash
// dates (the company's standard export format). Also accepts YYYY-MM-DD.
export function parseDateToISO(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "" || s === "-") return null;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const slash = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (slash) {
    let [, d, m, y] = slash;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

// Map free-text service descriptions onto the app's fixed service list.
export function normalizeService(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase();
  if (s.trim() === "") return "Other";
  if (/\bload\b|laundry|duvet|fleece|blanket|curtain/.test(s)) {
    // Combinations dominated by a non-laundry on-site service -> Deep Cleaning
    if (/(sofa|carpet|fumigation).*(sofa|carpet|fumigation)/.test(s)) return "Deep Cleaning";
    return "Laundry";
  }
  if (/(sofa|upholstery).*(carpet)|(carpet).*(sofa|upholstery)/.test(s)) return "Deep Cleaning";
  if (/(fumigation).*(sofa|carpet)|(sofa|carpet).*(fumigation)/.test(s)) return "Deep Cleaning";
  if (/deep clean/.test(s)) return "Deep Cleaning";
  if (/carpet/.test(s)) return "Carpet Cleaning";
  if (/sofa|upholstery/.test(s)) return "Sofa/Upholstery";
  if (/fumigation/.test(s)) return "Fumigation";
  if (/mattress/.test(s)) return "Mattress Cleaning";
  if (/car wash|carwash/.test(s)) return "Car Wash";
  if (/office/.test(s)) return "Office Cleaning";
  if (/renovation|post.?reno/.test(s)) return "Post-Renovation Cleaning";
  if (/toilet|floor|scrub|general/.test(s)) return "Other";
  return "Other";
}

// Map free-text statuses onto the app's fixed status list.
export function normalizeStatus(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase();
  if (/refer/.test(s)) return "Referral";
  if (/exist/.test(s)) return "Existing";
  if (/new/.test(s)) return "New";
  return "New";
}

// Given parsed rows (array of arrays) find the header row index by matching
// a set of required keywords, then build a header->index map for that row.
export function findHeader(
  rows: string[][],
  required: RegExp[],
): { headerIndex: number; columns: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c ?? "").trim());
    const matchesAll = required.every((re) => cells.some((c) => re.test(c)));
    if (matchesAll) {
      const columns: Record<string, number> = {};
      cells.forEach((c, idx) => {
        const key = c.toLowerCase().replace(/\s+/g, " ").trim();
        if (key && !(key in columns)) columns[key] = idx;
      });
      return { headerIndex: i, columns };
    }
  }
  return null;
}

// Find a column index by trying several header aliases (case-insensitive,
// substring match against the normalized header keys).
export function col(columns: Record<string, number>, aliases: string[]): number | undefined {
  for (const alias of aliases) {
    const a = alias.toLowerCase();
    for (const key of Object.keys(columns)) {
      if (key === a || key.includes(a)) return columns[key];
    }
  }
  return undefined;
}

export function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(row[idx] ?? "").trim();
}

// ---------------------------------------------------------------------------
// parseJobCsvRows
// ---------------------------------------------------------------------------

export type ParsedJobRow = {
  date: string;
  clientName: string;
  serviceType: string;
  description?: string;
  location?: string;
  amount: number;
  teamMembers: number;
};

export type ParseJobCsvResult =
  | { ok: true; rows: ParsedJobRow[]; skippedZeroAmount: number }
  | { ok: false; error: string };

/**
 * Parse a 2-D array of CSV cells (as returned by PapaParse) into a list of
 * valid job rows, applying the same filtering logic as the UI's handleCsv.
 *
 * Returns `{ ok: false, error }` for any of these cases:
 *  - No header row containing "date" and "client/customer" is found
 *  - All data rows are filtered out (expense/total markers, missing date,
 *    or zero-amount)
 */
export function parseJobCsvRows(data: string[][]): ParseJobCsvResult {
  if (data.length === 0) {
    return { ok: false, error: "Couldn't find a header row with Date and Client columns" };
  }

  const header = findHeader(data, [/date/i, /client|customer/i]);
  if (!header) {
    return { ok: false, error: "Couldn't find a header row with Date and Client columns" };
  }

  const { headerIndex, columns } = header;
  const dateIdx = col(columns, ["date"]);
  const clientIdx = col(columns, ["client name", "client", "customer"]);
  const serviceIdx = col(columns, ["service type", "service", "description"]);
  const amountIdx = col(columns, ["amount", "cost", "price"]);
  const locationIdx = col(columns, ["location", "client location"]);
  const teamIdx = col(columns, ["team"]);

  const rows: ParsedJobRow[] = [];
  let skippedZeroAmount = 0;
  for (let i = headerIndex + 1; i < data.length; i++) {
    const r = data[i];
    const clientName = cell(r, clientIdx);
    if (!clientName || /^expense/i.test(clientName) || /total/i.test(clientName)) continue;
    const serviceRaw = cell(r, serviceIdx);
    if (/^expense$/i.test(serviceRaw)) continue;
    const date = parseDateToISO(cell(r, dateIdx));
    if (!date) continue;
    const amount = parseKES(cell(r, amountIdx));
    if (amount === 0) {
      skippedZeroAmount++;
      continue;
    }
    const teamRaw = cell(r, teamIdx);
    rows.push({
      date,
      clientName,
      serviceType: normalizeService(serviceRaw),
      description: serviceRaw || undefined,
      location: cell(r, locationIdx) || undefined,
      amount,
      teamMembers: teamRaw ? (parseInt(teamRaw, 10) || 0) : 0,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No valid job rows found in CSV" };
  }
  return { ok: true, rows, skippedZeroAmount };
}

// ---------------------------------------------------------------------------
// parseExpenseCsvRows
// ---------------------------------------------------------------------------

export type ParsedExpenseRow = {
  date: string;
  category: string;
  description: string;
  amount: number;
};

export type ParseExpenseCsvResult =
  | { ok: true; rows: ParsedExpenseRow[]; skippedZeroAmount: number }
  | { ok: false; error: string };

/**
 * Parse a 2-D array of CSV cells (as returned by PapaParse with header:false)
 * into a list of valid expense rows, applying the same safety checks as
 * parseJobCsvRows.
 *
 * Returns `{ ok: false, error }` for any of these cases:
 *  - No header row containing "date" and "amount" is found
 *  - All data rows are filtered out (missing date or zero amount)
 */
export function parseExpenseCsvRows(data: string[][]): ParseExpenseCsvResult {
  if (data.length === 0) {
    return { ok: false, error: "Couldn't find a header row with Date and Amount columns" };
  }

  const header = findHeader(data, [/date/i, /amount/i]);
  if (!header) {
    return { ok: false, error: "Couldn't find a header row with Date and Amount columns" };
  }

  const { headerIndex, columns } = header;
  const dateIdx = col(columns, ["date"]);
  const categoryIdx = col(columns, ["category"]);
  const descriptionIdx = col(columns, ["description", "note", "notes", "details"]);
  const amountIdx = col(columns, ["amount", "cost", "price"]);

  const rows: ParsedExpenseRow[] = [];
  let skippedZeroAmount = 0;
  for (let i = headerIndex + 1; i < data.length; i++) {
    const r = data[i];
    const date = parseDateToISO(cell(r, dateIdx));
    if (!date) continue;
    const amount = parseKES(cell(r, amountIdx));
    if (amount === 0) {
      skippedZeroAmount++;
      continue;
    }
    rows.push({
      date,
      category: cell(r, categoryIdx) || "Other",
      description: cell(r, descriptionIdx) || "Imported expense",
      amount,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "No valid expense rows found in CSV" };
  }
  return { ok: true, rows, skippedZeroAmount };
}
