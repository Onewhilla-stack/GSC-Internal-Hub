import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import {
  useListReceipts,
  useCreateReceipt,
  useUpdateReceipt,
  useDeleteReceipt,
  useGetReceiptsSummary,
  useGetJob,
  getListReceiptsQueryKey,
  getGetReceiptsSummaryQueryKey,
  getGetJobQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range";
import { DateRangePicker } from "@/components/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Eye, Download, Pencil, Trash2, ReceiptText, CheckCircle, Clock, AlertCircle, AlertTriangle, FileText, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import gscLogo from "@assets/GSC_Logo_1780918691102.png";

// ─── Types ────────────────────────────────────────────────────────────────────
type ReceiptItem = {
  serviceType: string;
  description?: string | null;
  amount: number;
};

type ReceiptRow = {
  id: number;
  receiptNumber: string;
  jobId?: number | null;
  jobWasDeleted?: boolean | null;
  clientName: string;
  serviceType: string;
  description?: string | null;
  items?: ReceiptItem[];
  amount: number;
  date: string;
  paymentStatus: string;
  notes?: string | null;
  createdBy?: string | null;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
  createdAt: string;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
const createReceiptSchema = z.object({
  jobId: z.number().nullable().optional(),
  clientName: z.string().min(1, "Client name required"),
  date: z.string().min(1, "Date required"),
  paymentStatus: z.string().default("Pending"),
  notes: z.string().optional(),
  items: z.array(z.object({
    serviceType: z.string().min(1, "Service required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
  })).min(1, "Add at least one service"),
});

const editReceiptSchema = z.object({
  paymentStatus: z.string().min(1),
  notes: z.string().optional(),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  items: z.array(z.object({
    serviceType: z.string().min(1, "Service required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
  })).optional(),
});

const SERVICES = [
  "Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery Cleaning",
  "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning",
  "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning",
  "General Cleaning", "Other",
];
const STATUSES = ["Paid", "Pending", "Partial"];

// Reduce a job or receipt down to a comparable list of services. A single-service
// job keeps its details on the job itself, so it is mirrored as a one-item list
// (the same shape a receipt always stores).
type CanonicalService = { serviceType: string; description: string; amount: number };

function jobToServices(job: { serviceType: string; description?: string | null; amount: number; items?: ReceiptItem[] | null }): CanonicalService[] {
  if (job.items && job.items.length > 0) {
    return job.items.map((it) => ({ serviceType: it.serviceType, description: it.description ?? "", amount: Number(it.amount) || 0 }));
  }
  return [{ serviceType: job.serviceType, description: job.description ?? "", amount: Number(job.amount) || 0 }];
}

function receiptToServices(items: ReceiptItem[]): CanonicalService[] {
  return items.map((it) => ({ serviceType: it.serviceType, description: it.description ?? "", amount: Number(it.amount) || 0 }));
}

function servicesEqual(a: CanonicalService[], b: CanonicalService[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((it, i) =>
    it.serviceType === b[i].serviceType &&
    it.description === b[i].description &&
    Math.abs(it.amount - b[i].amount) < 0.005
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ title, count, amount, color, icon, showAmount }: {
  title: string; count: number; amount: number; color: string; icon?: React.ReactNode; showAmount: boolean;
}) {
  return (
    <Card className={`shadow-sm border-t-4 ${color}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold">{count}</p>
        {showAmount && (
          <p className="text-sm text-gray-500 mt-0.5">{formatKES(amount)}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Receipt Preview Component ────────────────────────────────────────────────
function ReceiptPreview({ receipt, isPrint = false }: { receipt: Partial<ReceiptRow> & { receiptNumber: string; paymentStatus: string }; isPrint?: boolean }) {
  const lineItems = receipt.items ?? [];
  return (
    <div className={`relative overflow-hidden bg-white p-8 w-full max-w-sm mx-auto ${isPrint ? "" : "shadow-md rounded"}`}>
      {/* Watermark */}
      <img
        src={gscLogo}
        alt=""
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 opacity-[0.07] pointer-events-none select-none"
      />
      <div className="relative">
      <div className="text-center mb-6">
        <img src={gscLogo} alt="Gold Standard Cleaners" className="h-16 mx-auto mb-2" />
        <h2 className={`text-2xl font-extrabold tracking-tighter ${isPrint ? "text-black" : "text-[#29ABE2]"}`}>
          GOLD STANDARD CLEANERS
        </h2>
        <p className={`text-xs font-bold tracking-widest uppercase mt-1 ${isPrint ? "text-black" : "text-[#F5C518]"}`}>
          HOME CLEANING EXPERTS
        </p>
        <div className="mt-3 text-xs text-gray-500 space-y-0.5">
          <p>0708 454 392 / 0768 442 229</p>
          <p>Ngong Road, Nairobi</p>
        </div>
      </div>

      <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Receipt No:</span>
          <span className="font-mono font-semibold">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date:</span>
          <span>{receipt.date ? formatDate(receipt.date) : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Client:</span>
          <span className="font-semibold text-right">{receipt.clientName || "—"}</span>
        </div>
      </div>

      <div className="mb-6 text-sm">
        <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wide mb-2">
          <span>Service</span>
          <span>Amount</span>
        </div>
        <div className="space-y-2">
          {(lineItems.length > 0 ? lineItems : [{ serviceType: receipt.serviceType ?? "—", description: receipt.description, amount: receipt.amount ?? 0 }]).map((it, i) => (
            <div key={i} className="flex justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{it.serviceType || "—"}</div>
                {it.description && <div className="text-xs text-gray-500">{it.description}</div>}
              </div>
              <div className="font-mono whitespace-nowrap">{formatKES(it.amount ?? 0)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
        <span className="font-bold text-lg">TOTAL</span>
        <span className="text-2xl font-bold font-mono">{formatKES(receipt.amount ?? 0)}</span>
      </div>

      <div className="mt-3 flex justify-between items-center text-sm">
        <span className="text-gray-500">Payment Status:</span>
        {isPrint ? (
          <span className="font-bold">{receipt.paymentStatus}</span>
        ) : (
          <StatusBadge status={receipt.paymentStatus} />
        )}
      </div>

      {receipt.notes && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 border border-gray-200">
          <span className="font-medium">Note: </span>{receipt.notes}
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-400 border-t pt-4">
        <p className="font-medium">Gold Standard Cleaners</p>
        <p className="italic mt-0.5">Thank you for your business!</p>
      </div>
      </div>{/* end relative wrapper */}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Receipts() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rawSearch = useSearch();

  const { from, to } = useDateRange();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<ReceiptRow | null>(null);
  const [editReceipt, setEditReceipt] = useState<ReceiptRow | null>(null);

  // Parse URL params for pre-fill (from Jobs page "Generate Receipt" button).
  // wouter's useSearch() returns the query string (without the leading "?");
  // useLocation() returns only the pathname, so it can't be used here.
  const urlParams = new URLSearchParams(rawSearch);
  const prefillClient = urlParams.get("client") ?? "";
  const prefillService = urlParams.get("service") ?? "";
  const prefillAmount = parseFloat(urlParams.get("amount") ?? "0");
  const prefillDate = urlParams.get("date") ?? new Date().toISOString().split("T")[0];
  // When a receipt is generated from a job, link it back to that job so the
  // receipt row carries jobId (otherwise receipts.jobId stays null).
  const prefillJobIdRaw = urlParams.get("jobId");
  const prefillJobId = prefillJobIdRaw && !Number.isNaN(Number(prefillJobIdRaw)) ? Number(prefillJobIdRaw) : null;

  // Forms
  const emptyItem = { serviceType: "", description: "", amount: 0 };

  // A visit can pass multiple line items via an "items" JSON param; otherwise we
  // fall back to a single service/amount prefill.
  function parsePrefillItems(): { serviceType: string; description: string; amount: number }[] {
    const raw = urlParams.get("items");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { serviceType?: string; description?: string; amount?: number }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it) => ({
            serviceType: it.serviceType ?? "",
            description: it.description ?? "",
            amount: Number(it.amount) || 0,
          }));
        }
      } catch {
        // fall through to single-service / empty default
      }
    }
    if (prefillService) {
      return [{ serviceType: prefillService, description: "", amount: prefillAmount }];
    }
    return [{ ...emptyItem }];
  }

  const createForm = useForm<z.infer<typeof createReceiptSchema>>({
    resolver: zodResolver(createReceiptSchema),
    defaultValues: {
      jobId: prefillJobId,
      clientName: prefillClient,
      date: prefillDate,
      paymentStatus: "Pending",
      notes: "",
      items: parsePrefillItems(),
    },
  });

  const itemsArray = useFieldArray({ control: createForm.control, name: "items" });

  const editForm = useForm<z.infer<typeof editReceiptSchema>>({
    resolver: zodResolver(editReceiptSchema),
    defaultValues: { paymentStatus: "Pending", notes: "", serviceType: "", description: "", amount: 0, items: [] },
  });

  const editItemsArray = useFieldArray({ control: editForm.control, name: "items" });
  const editItems = editForm.watch("items") ?? [];
  const isMultiEdit = editItems.length > 0;

  // When a receipt was generated from a job, load that job so we can flag when the
  // two have drifted apart and let the director pull the latest services back in.
  const sourceJobId = editReceipt?.jobId ?? null;
  const { data: sourceJob } = useGetJob(sourceJobId ?? 0, {
    query: {
      queryKey: getGetJobQueryKey(sourceJobId ?? 0),
      enabled: !!editReceipt && sourceJobId != null,
    },
  });
  const jobServices = sourceJob ? jobToServices(sourceJob) : null;
  const receiptDiffersFromJob =
    !!jobServices && !!editReceipt && !servicesEqual(jobServices, receiptToServices(editReceipt.items ?? []));

  function pullFromJob() {
    if (!jobServices) return;
    if (jobServices.length > 1) {
      editForm.setValue("serviceType", "");
      editForm.setValue("description", "");
      editForm.setValue("amount", 0);
      editItemsArray.replace(jobServices.map((it) => ({ serviceType: it.serviceType, description: it.description, amount: it.amount })));
    } else {
      const only = jobServices[0];
      editForm.setValue("serviceType", only.serviceType);
      editForm.setValue("description", only.description);
      editForm.setValue("amount", only.amount);
      editItemsArray.replace([]);
    }
  }
  const editSingleAmount = editForm.watch("amount");
  const editTotal = isMultiEdit
    ? editItems.reduce((s, it) => s + (Number(it?.amount) || 0), 0)
    : (Number(editSingleAmount) || 0);

  // When navigated from the Job Tracker with ?viewId=<receiptNumber>, auto-open
  // the view dialog for that receipt once the list loads.
  const prefillViewId = urlParams.get("viewId") ?? "";
  // ?printId=<receiptNumber> — same as viewId but also fires window.print()
  const prefillPrintId = urlParams.get("printId") ?? "";
  const [autoPrint, setAutoPrint] = useState(false);

  // Open create dialog when URL has a prefill client name
  useEffect(() => {
    if (prefillClient) {
      setCreateOpen(true);
    }
  }, []);

  // Queries
  const listKey = getListReceiptsQueryKey({
    from,
    to,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });
  const summaryKey = getGetReceiptsSummaryQueryKey({ from, to });

  const { data: receipts, isLoading } = useListReceipts(
    {
      from,
      to,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: search || undefined,
    },
    { query: { queryKey: listKey } }
  );

  // When navigated here with ?viewId=<receiptNumber>, fetch that specific receipt
  // (bypassing date range/status filters so it's always found) and auto-open the
  // view dialog.
  const viewIdKey = getListReceiptsQueryKey({ search: prefillViewId });
  const { data: viewIdResults } = useListReceipts(
    { search: prefillViewId },
    { query: { queryKey: viewIdKey, enabled: !!prefillViewId } }
  );
  useEffect(() => {
    if (!prefillViewId || !viewIdResults) return;
    const match = (viewIdResults as ReceiptRow[]).find(
      (r) => r.receiptNumber === prefillViewId
    );
    if (match) setViewReceipt(match);
  }, [prefillViewId, viewIdResults]);

  // When navigated here with ?printId=<receiptNumber>, auto-open the receipt
  // and immediately trigger the browser print dialog.
  const printIdKey = getListReceiptsQueryKey({ search: prefillPrintId });
  const { data: printIdResults } = useListReceipts(
    { search: prefillPrintId },
    { query: { queryKey: printIdKey, enabled: !!prefillPrintId } }
  );
  useEffect(() => {
    if (!prefillPrintId || !printIdResults) return;
    const match = (printIdResults as ReceiptRow[]).find(
      (r) => r.receiptNumber === prefillPrintId
    );
    if (match) {
      setViewReceipt(match);
      setAutoPrint(true);
    }
  }, [prefillPrintId, printIdResults]);

  // Once the receipt dialog is open and autoPrint is set, fire window.print()
  // after a short delay to let the dialog finish rendering.
  useEffect(() => {
    if (!autoPrint || !viewReceipt) return;
    const timer = setTimeout(() => {
      window.print();
      setAutoPrint(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [autoPrint, viewReceipt]);

  const { data: summary } = useGetReceiptsSummary(
    { from, to },
    { query: { queryKey: summaryKey } }
  );

  // Mutations
  const createReceipt = useCreateReceipt({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        queryClient.invalidateQueries({ queryKey: summaryKey });
        setCreateOpen(false);
        createForm.reset({ clientName: "", date: new Date().toISOString().split("T")[0], paymentStatus: "Pending", notes: "", items: [{ serviceType: "", description: "", amount: 0 }] });
        setViewReceipt(data as ReceiptRow);
        toast({ title: `Receipt ${(data as ReceiptRow).receiptNumber} generated` });
      },
    },
  });

  const updateReceipt = useUpdateReceipt({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        queryClient.invalidateQueries({ queryKey: summaryKey });
        setEditReceipt(null);
        toast({ title: "Receipt updated" });
      },
    },
  });

  const deleteReceipt = useDeleteReceipt({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        queryClient.invalidateQueries({ queryKey: summaryKey });
        toast({ title: "Receipt deleted" });
      },
    },
  });

  function openEdit(r: ReceiptRow) {
    const its = r.items ?? [];
    const multi = its.length > 1;
    editForm.reset({
      paymentStatus: r.paymentStatus,
      notes: r.notes ?? "",
      serviceType: multi ? "" : (its[0]?.serviceType ?? r.serviceType),
      description: multi ? "" : (its[0]?.description ?? r.description ?? ""),
      amount: multi ? 0 : (its[0]?.amount ?? r.amount),
      items: multi
        ? its.map((it) => ({ serviceType: it.serviceType, description: it.description ?? "", amount: it.amount }))
        : [],
    });
    setEditReceipt(r);
  }

  function convertEditToMulti() {
    const cur = editForm.getValues();
    editItemsArray.replace([
      { serviceType: cur.serviceType || "", description: cur.description || "", amount: Number(cur.amount) || 0 },
      { serviceType: "", description: "", amount: 0 },
    ]);
  }

  function collapseEditToSingle() {
    const only = (editForm.getValues("items") ?? [])[0];
    editForm.setValue("serviceType", only?.serviceType ?? "");
    editForm.setValue("description", only?.description ?? "");
    editForm.setValue("amount", Number(only?.amount) || 0);
    editItemsArray.replace([]);
  }

  function submitEdit(data: z.infer<typeof editReceiptSchema>) {
    // Only directors may change the services; workers send a status/notes-only
    // update (omitting items keeps the stored line items untouched).
    if (!isDirector) {
      updateReceipt.mutate({
        id: editReceipt!.id,
        data: { paymentStatus: data.paymentStatus, notes: data.notes },
      });
      return;
    }
    const finalItems = (data.items && data.items.length > 0)
      ? data.items
      : [{ serviceType: data.serviceType ?? "", description: data.description ?? "", amount: Number(data.amount) || 0 }];
    updateReceipt.mutate({
      id: editReceipt!.id,
      data: { paymentStatus: data.paymentStatus, notes: data.notes, items: finalItems },
    });
  }

  const livePreview = createForm.watch();
  const itemsTotal = (livePreview.items ?? []).reduce((s, it) => s + (Number(it?.amount) || 0), 0);

  const totalAmount = (summary?.amountPaid ?? 0) + (summary?.amountPending ?? 0) + (summary?.amountPartial ?? 0);

  return (
    <>
      {/* Print-only area — only receipt is shown when printing */}
      {viewReceipt && (
        <div className="print-only">
          <ReceiptPreview receipt={viewReceipt} isPrint />
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ReceiptText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-primary">Receipts</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker />
            <Button
              className="bg-secondary text-black hover:bg-secondary/90 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> New Receipt
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total This Month"
            count={summary?.total ?? 0}
            amount={totalAmount}
            color="border-t-primary"
            showAmount={isDirector}
          />
          <SummaryCard
            title="Paid"
            count={summary?.totalPaid ?? 0}
            amount={summary?.amountPaid ?? 0}
            color="border-t-green-500"
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            showAmount={isDirector}
          />
          <SummaryCard
            title="Pending"
            count={summary?.totalPending ?? 0}
            amount={summary?.amountPending ?? 0}
            color="border-t-red-500"
            icon={<Clock className="h-4 w-4 text-red-500" />}
            showAmount={isDirector}
          />
          <SummaryCard
            title="Partial"
            count={summary?.totalPartial ?? 0}
            amount={summary?.amountPartial ?? 0}
            color="border-t-orange-500"
            icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
            showAmount={isDirector}
          />
        </div>

        {/* Filters + Table */}
        <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search client or receipt #..."
                className="pl-9 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white">Receipt #</TableHead>
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Client</TableHead>
                  <TableHead className="text-white">Service</TableHead>
                  <TableHead className="text-white text-right">Amount</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">By</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32">
                      <Spinner />
                    </TableCell>
                  </TableRow>
                ) : !receipts?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No receipts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  (receipts as ReceiptRow[]).map((r) => (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {r.receiptNumber}
                          {r.jobWasDeleted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 w-fit">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Source job deleted
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.clientName}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {r.serviceType}
                        {(r.items?.length ?? 0) > 1 && (
                          <span className="ml-1 text-xs text-gray-400">({r.items!.length})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold whitespace-nowrap">{formatKES(r.amount)}</TableCell>
                      <TableCell><StatusBadge status={r.paymentStatus} /></TableCell>
                      <TableCell className="text-xs text-gray-400">{r.createdBy ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7" title="View receipt"
                            onClick={() => setViewReceipt(r)}
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7" title="Edit status / notes"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          {isDirector && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {r.receiptNumber}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Receipt for <strong>{r.clientName}</strong> ({formatKES(r.amount)}) will be permanently removed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteReceipt.mutate({ id: r.id })}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── Create Receipt Dialog ────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            createForm.reset({ clientName: "", date: new Date().toISOString().split("T")[0], paymentStatus: "Pending", notes: "", items: [{ serviceType: "", description: "", amount: 0 }] });
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              Generate New Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Form */}
            <div>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit((data) => createReceipt.mutate({ data }))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="clientName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl><Input placeholder="Client name..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Service line items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Services</span>
                      <Button
                        type="button" variant="outline" size="sm" className="gap-1 h-8"
                        onClick={() => itemsArray.append({ serviceType: "", description: "", amount: 0 })}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Service
                      </Button>
                    </div>

                    {itemsArray.fields.map((fieldItem, index) => (
                      <div key={fieldItem.id} className="rounded-lg border border-gray-200 p-3 space-y-2 relative bg-gray-50/50">
                        {itemsArray.fields.length > 1 && (
                          <button
                            type="button"
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            title="Remove service"
                            onClick={() => itemsArray.remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <FormField control={createForm.control} name={`items.${index}.serviceType`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Service</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField control={createForm.control} name={`items.${index}.description`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Description (optional)</FormLabel>
                              <FormControl><Input className="bg-white" placeholder="Details..." {...field} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={createForm.control} name={`items.${index}.amount`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Amount (KES)</FormLabel>
                              <FormControl><Input className="bg-white" type="number" min="0" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center px-1 pt-1 text-sm font-semibold">
                      <span className="text-gray-500">Total</span>
                      <span className="font-mono">{formatKES(itemsTotal)}</span>
                    </div>
                  </div>

                  <FormField control={createForm.control} name="paymentStatus" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={createForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='e.g. "Paid via Mpesa" or "Balance of KES 500 remaining"'
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    disabled={createReceipt.isPending}
                    className="w-full bg-secondary text-black hover:bg-secondary/90"
                  >
                    {createReceipt.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Save Receipt
                  </Button>
                </form>
              </Form>
            </div>

            {/* Live Preview */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-start justify-center min-h-[400px]">
              <ReceiptPreview
                receipt={{
                  id: 0,
                  receiptNumber: "GSC-RCT-???",
                  clientName: livePreview.clientName,
                  serviceType: (livePreview.items?.length ?? 0) > 1 ? "Multiple Services" : (livePreview.items?.[0]?.serviceType ?? ""),
                  items: (livePreview.items ?? []).map((it) => ({
                    serviceType: it?.serviceType ?? "",
                    description: it?.description,
                    amount: Number(it?.amount) || 0,
                  })),
                  amount: itemsTotal,
                  date: livePreview.date,
                  paymentStatus: livePreview.paymentStatus || "Pending",
                  notes: livePreview.notes,
                  createdAt: new Date().toISOString(),
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View/Print Receipt Dialog ────────────────────────────────────── */}
      <Dialog open={!!viewReceipt} onOpenChange={(open) => !open && setViewReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {viewReceipt?.receiptNumber}
            </DialogTitle>
          </DialogHeader>
          {viewReceipt?.jobWasDeleted && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800">
                <span className="font-medium">Source job deleted.</span> This receipt was linked to a job that no longer exists.
              </p>
            </div>
          )}
          {viewReceipt && <ReceiptPreview receipt={viewReceipt} />}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewReceipt(null)}>Close</Button>
            <Button className="bg-primary text-white gap-2" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Receipt Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!editReceipt} onOpenChange={(open) => !open && setEditReceipt(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editReceipt?.receiptNumber}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-500 mb-2">
            {editReceipt?.clientName} — {formatKES(editTotal)}
          </div>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(submitEdit)}
              className="space-y-4"
            >
              {/* Source job deleted warning */}
              {editReceipt?.jobWasDeleted && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-800">
                    <span className="font-medium">Source job deleted.</span> This receipt was originally linked to a job that has since been deleted.
                  </p>
                </div>
              )}

              {/* Drift warning — this receipt no longer matches its source job */}
              {isDirector && receiptDiffersFromJob && (
                <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-orange-800 font-medium">This receipt no longer matches its source job.</p>
                      <p className="text-orange-700 mt-0.5">
                        The job now totals {formatKES((jobServices ?? []).reduce((s, it) => s + it.amount, 0))}
                        {" "}across {jobServices?.length} service{(jobServices?.length ?? 0) > 1 ? "s" : ""}.
                      </p>
                      <Button type="button" variant="outline" size="sm" className="mt-2 h-8 border-orange-400 text-orange-700 hover:bg-orange-100" onClick={pullFromJob}>
                        Pull latest from job
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Services — directors only */}
              {isDirector && (
                <div className="rounded-lg border border-gray-200 p-3 space-y-3 bg-gray-50/50">
                  {!isMultiEdit ? (
                    <>
                      <FormField control={editForm.control} name="serviceType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Service</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={editForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description (optional)</FormLabel>
                            <FormControl><Input className="bg-white" placeholder="Details..." {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={editForm.control} name="amount" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Amount (KES)</FormLabel>
                            <FormControl><Input className="bg-white" type="number" min="0" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={convertEditToMulti}>
                        <Plus className="h-3.5 w-3.5" /> Add another service
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Services</span>
                        <div className="flex items-center gap-2">
                          {editItemsArray.fields.length === 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-8 text-primary" onClick={collapseEditToSingle}>
                              Switch to single service
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => editItemsArray.append({ serviceType: "", description: "", amount: 0 })}>
                            <Plus className="h-3.5 w-3.5" /> Add Service
                          </Button>
                        </div>
                      </div>
                      {editItemsArray.fields.map((fieldItem, index) => (
                        <div key={fieldItem.id} className="rounded-lg border border-gray-200 p-3 space-y-2 relative bg-white">
                          {editItemsArray.fields.length > 1 && (
                            <button
                              type="button"
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                              title="Remove service"
                              onClick={() => editItemsArray.remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <FormField control={editForm.control} name={`items.${index}.serviceType`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Service</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-2">
                            <FormField control={editForm.control} name={`items.${index}.description`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Description (optional)</FormLabel>
                                <FormControl><Input className="bg-white" placeholder="Details..." {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <FormField control={editForm.control} name={`items.${index}.amount`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Amount (KES)</FormLabel>
                                <FormControl><Input className="bg-white" type="number" min="0" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex justify-between items-center px-1 pt-1 text-sm font-semibold">
                    <span className="text-gray-500">Total</span>
                    <span className="font-mono">{formatKES(editTotal)}</span>
                  </div>
                </div>
              )}

              <FormField control={editForm.control} name="paymentStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a note..." rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditReceipt(null)}>Cancel</Button>
                <Button type="submit" disabled={updateReceipt.isPending} className="bg-primary text-white">
                  {updateReceipt.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
