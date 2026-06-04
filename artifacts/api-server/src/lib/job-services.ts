import type { JobItem } from "@workspace/db";

// Label stored on a visit's serviceType when it covers more than one line item.
// Individual service breakdowns expand the items[] array rather than relying on
// this label, but it is what the UI shows for the row total.
export const MULTIPLE_SERVICES_LABEL = "Multiple Services";

type ServiceLineItem = { serviceType: string; description?: string; amount: number };

export type ResolveServicesInput = {
  serviceType?: string;
  amount?: number;
  items?: ServiceLineItem[];
};

export type ResolvedServices =
  | { ok: true; serviceType: string; amount: number; items: JobItem[] | null }
  | { ok: false; error: string };

// A visit can be logged either as a single service (serviceType + amount) or as
// multiple line items. When items are present, the total amount and serviceType
// label are derived from them so wages/analytics stay consistent. A single-item
// array collapses to that one item's service label (not "Multiple Services").
export function resolveJobServices(input: ResolveServicesInput): ResolvedServices {
  if (input.items && input.items.length > 0) {
    const items: JobItem[] = input.items.map((it) => ({
      serviceType: it.serviceType,
      description: it.description ?? null,
      amount: it.amount,
    }));
    const amount = items.reduce((sum, it) => sum + it.amount, 0);
    const serviceType = items.length === 1 ? items[0].serviceType : MULTIPLE_SERVICES_LABEL;
    return { ok: true, serviceType, amount, items };
  }
  if (input.serviceType == null || input.amount == null) {
    return { ok: false, error: "Either items or both serviceType and amount are required" };
  }
  return { ok: true, serviceType: input.serviceType, amount: input.amount, items: null };
}

export type ExistingJobServices = {
  serviceType: string;
  amount: number;
  items: JobItem[] | null;
};

export type JobUpdateServicesInput = {
  serviceType?: string;
  amount?: number;
  // undefined = field omitted (keep stored items), null = explicit collapse to a
  // single service, array = replace with the supplied line items.
  items?: ServiceLineItem[] | null;
};

export type ResolvedJobUpdate =
  | { ok: true; serviceType: string | undefined; amount: number; items: JobItem[] | null | undefined }
  | { ok: false; error: string };

// ─── Receipt sync helper ──────────────────────────────────────────────────────

export type ReceiptLineItem = {
  serviceType: string;
  description: string | null;
  amount: number;
};

export type DerivedReceiptItems = {
  items: ReceiptLineItem[];
  total: number;
  serviceType: string;
};

// Derive the receipt line items, total, and service-type label from an updated
// job row. This mirrors the logic used at receipt-creation time so that
// printed/issued receipts never silently disagree with the underlying job:
//
//  - Multi-service job (items array present and non-empty): map each stored
//    line item to a receipt item; label is "Multiple Services".
//  - Single-service job (no items array): produce one receipt item from the
//    top-level serviceType/description/amount; label stays as-is.
//
// The single-service fallback keeps receipts for pre-items-era jobs working
// correctly even when syncReceipts is triggered by an unrelated edit.
export function deriveReceiptLineItems(job: {
  items: JobItem[] | null | undefined;
  serviceType: string;
  description: string | null | undefined;
  amount: number;
}): DerivedReceiptItems {
  const receiptItems: ReceiptLineItem[] =
    job.items && job.items.length > 0
      ? job.items.map((it) => ({
          serviceType: it.serviceType,
          description: it.description ?? null,
          amount: it.amount,
        }))
      : [
          {
            serviceType: job.serviceType,
            description: job.description ?? null,
            amount: job.amount,
          },
        ];

  const total = receiptItems.reduce((s, it) => s + it.amount, 0);
  const serviceType =
    receiptItems.length === 1
      ? receiptItems[0].serviceType
      : MULTIPLE_SERVICES_LABEL;

  return { items: receiptItems, total, serviceType };
}

// ─── Job update services ──────────────────────────────────────────────────────

// Decide a job's serviceType/amount/items on PATCH. The items field is the pivot:
//  - explicit null  -> collapse a multi-service visit back to a single service,
//    using the supplied serviceType/amount (or the existing values).
//  - array supplied -> replace with those line items (total/label derived).
//  - omitted (undefined):
//      * if the stored row is multi-service, keep its items and recompute the
//        total/label from them so an amount-only edit can't desync the row.
//      * otherwise it's a single-service edit: take the supplied serviceType and
//        amount (falling back to the existing amount).
// Returning items === undefined signals "don't touch the stored items column".
export function resolveJobUpdateServices(
  input: JobUpdateServicesInput,
  existing: ExistingJobServices,
): ResolvedJobUpdate {
  if (input.items === null) {
    return {
      ok: true,
      serviceType: input.serviceType ?? existing.serviceType,
      amount: input.amount ?? existing.amount,
      items: null,
    };
  }
  if (input.items !== undefined) {
    const r = resolveJobServices({ items: input.items });
    if (!r.ok) return r;
    return { ok: true, serviceType: r.serviceType, amount: r.amount, items: r.items };
  }
  if (existing.items && existing.items.length > 0) {
    const stored = existing.items.map((it) => ({
      serviceType: it.serviceType,
      description: it.description ?? undefined,
      amount: it.amount,
    }));
    const r = resolveJobServices({ items: stored });
    return {
      ok: true,
      serviceType: r.ok ? r.serviceType : existing.serviceType,
      amount: r.ok ? r.amount : existing.amount,
      items: undefined,
    };
  }
  return {
    ok: true,
    serviceType: input.serviceType,
    amount: input.amount ?? existing.amount,
    items: undefined,
  };
}
