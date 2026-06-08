import { useState } from "react";
import {
  useListQuotations,
  useCreateQuotation,
  useUpdateQuotation,
  useDeleteQuotation,
  getListQuotationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
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
import { Search, Plus, Eye, Printer, Pencil, Trash2, FileText, Clock, CheckCircle, XCircle, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuotationItem = {
  serviceType: string;
  description?: string | null;
  amount: number;
};

type QuotationRow = {
  id: number;
  quotationNumber: string;
  clientName: string;
  location?: string | null;
  date: string;
  expiryDate?: string | null;
  status: string;
  items: QuotationItem[];
  amount: number;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
const quotationSchema = z.object({
  clientName: z.string().min(1, "Client name required"),
  location: z.string().optional(),
  date: z.string().min(1, "Date required"),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    serviceType: z.string().min(1, "Service required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
  })).min(1, "Add at least one service"),
});

const SERVICES = [
  "Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery Cleaning",
  "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning",
  "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning",
  "General Cleaning", "Other",
];
const STATUSES = ["Pending", "Accepted", "Declined"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: React.ReactNode }> = {
    "Pending": { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
    "Accepted": { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
    "Declined": { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = cfg[status] ?? { color: "bg-gray-100 text-gray-700", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.icon}{status}
    </span>
  );
}

// ─── Quotation Print Preview ──────────────────────────────────────────────────
function QuotationPreview({ q, isPrint = false }: { q: Partial<QuotationRow> & { quotationNumber: string; status: string }; isPrint?: boolean }) {
  const items = q.items ?? [];
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return (
    <div className={`bg-white p-8 w-full max-w-sm mx-auto ${isPrint ? "" : "shadow-md rounded"}`}>
      <div className="text-center mb-6">
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

      <div className="text-center mb-4">
        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded">
          QUOTATION
        </span>
      </div>

      <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Quote No:</span>
          <span className="font-mono font-semibold">{q.quotationNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date:</span>
          <span>{q.date ? formatDate(q.date) : "—"}</span>
        </div>
        {q.expiryDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Valid Until:</span>
            <span>{formatDate(q.expiryDate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Client:</span>
          <span className="font-semibold text-right">{q.clientName || "—"}</span>
        </div>
        {q.location && (
          <div className="flex justify-between">
            <span className="text-gray-500">Location:</span>
            <span className="text-right">{q.location}</span>
          </div>
        )}
      </div>

      <div className="mb-6 text-sm">
        <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wide mb-2">
          <span>Service</span>
          <span>Amount</span>
        </div>
        <div className="space-y-2">
          {(items.length > 0 ? items : [{ serviceType: "—", description: null, amount: 0 }]).map((it, i) => (
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
        <span className="text-2xl font-bold font-mono">{formatKES(total)}</span>
      </div>

      {q.notes && (
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded p-2 border border-gray-200">
          <span className="font-medium">Note: </span>{q.notes}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400 border-t pt-4 space-y-1">
        <p className="font-medium">Terms & Conditions</p>
        <p>• This quotation is valid for 14 days from the date above (unless otherwise stated).</p>
        <p>• Prices may vary based on actual site conditions.</p>
        <p>• Payment is due upon completion of service.</p>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400 border-t pt-4">
        <p className="font-medium">Gold Standard Cleaners</p>
        <p className="italic mt-0.5">Thank you for considering our services!</p>
      </div>
    </div>
  );
}

// ─── Line Items Editor ────────────────────────────────────────────────────────
function LineItemsEditor({
  fields,
  control,
  append,
  remove,
  watch,
}: {
  fields: { id: string }[];
  control: any;
  append: (v: { serviceType: string; description: string; amount: number }) => void;
  remove: (i: number) => void;
  watch: (name: string) => any;
}) {
  const items = watch("items") as { serviceType: string; description: string; amount: number }[] ?? [];
  const total = items.reduce((s, it) => s + (Number(it?.amount) || 0), 0);

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div key={field.id} className="border rounded-md p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
            {fields.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <FormField
            control={control}
            name={`items.${i}.serviceType`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Service</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`items.${i}.description`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Description (optional)</FormLabel>
                <FormControl>
                  <Input className="h-8 text-sm" placeholder="Details..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`items.${i}.amount`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Amount (KES)</FormLabel>
                <FormControl>
                  <Input className="h-8 text-sm" type="number" min={0} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ serviceType: "", description: "", amount: 0 })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
        </Button>
        {fields.length > 1 && (
          <span className="text-sm font-semibold text-gray-700">
            Total: {formatKES(total)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Quotations() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<QuotationRow | null>(null);
  const [editQuotation, setEditQuotation] = useState<QuotationRow | null>(null);

  // Queries
  const listKey = getListQuotationsQueryKey({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const { data: quotations, isLoading } = useListQuotations(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: search || undefined,
    },
    { query: { queryKey: listKey } }
  );

  // Create form
  const createForm = useForm<z.infer<typeof quotationSchema>>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      clientName: "",
      location: "",
      date: new Date().toISOString().split("T")[0],
      expiryDate: "",
      notes: "",
      items: [{ serviceType: "", description: "", amount: 0 }],
    },
  });
  const createItems = useFieldArray({ control: createForm.control, name: "items" });

  // Edit form (status only for non-directors; full fields for directors)
  const STATUSES = ["Pending", "Accepted", "Declined"] as const;
  type QuotationStatus = typeof STATUSES[number];
  const editForm = useForm<z.infer<typeof quotationSchema> & { status: QuotationStatus }>({
    resolver: zodResolver(quotationSchema.extend({ status: z.enum(STATUSES) })),
    defaultValues: { clientName: "", location: "", date: "", expiryDate: "", notes: "", status: "Pending", items: [{ serviceType: "", description: "", amount: 0 }] },
  });
  const editItems = useFieldArray({ control: editForm.control, name: "items" });

  // Mutations
  const createQuotation = useCreateQuotation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
        setCreateOpen(false);
        createForm.reset();
        setViewQuotation(data as QuotationRow);
        toast({ title: `Quotation ${(data as QuotationRow).quotationNumber} created` });
      },
      onError: () => toast({ title: "Failed to create quotation", variant: "destructive" }),
    },
  });

  const updateQuotation = useUpdateQuotation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
        setEditQuotation(null);
        toast({ title: "Quotation updated" });
      },
      onError: () => toast({ title: "Failed to update quotation", variant: "destructive" }),
    },
  });

  const deleteQuotation = useDeleteQuotation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
        toast({ title: "Quotation deleted" });
      },
      onError: () => toast({ title: "Failed to delete quotation", variant: "destructive" }),
    },
  });

  function openEdit(q: QuotationRow) {
    editForm.reset({
      clientName: q.clientName,
      location: q.location ?? "",
      date: q.date,
      expiryDate: q.expiryDate ?? "",
      notes: q.notes ?? "",
      status: q.status as QuotationStatus,
      items: q.items.map(it => ({ serviceType: it.serviceType, description: it.description ?? "", amount: it.amount })),
    });
    setEditQuotation(q);
  }

  function submitCreate(data: z.infer<typeof quotationSchema>) {
    createQuotation.mutate({
      data: {
        clientName: data.clientName,
        location: data.location || undefined,
        date: data.date,
        expiryDate: data.expiryDate || undefined,
        notes: data.notes || undefined,
        items: data.items,
      },
    });
  }

  function submitEdit(data: z.infer<typeof quotationSchema> & { status: QuotationStatus }) {
    if (!editQuotation) return;
    updateQuotation.mutate({
      id: editQuotation.id,
      data: {
        clientName: data.clientName,
        location: data.location || undefined,
        date: data.date,
        expiryDate: data.expiryDate || undefined,
        status: data.status,
        notes: data.notes || undefined,
        items: data.items,
      },
    });
  }

  const rows = (quotations ?? []) as QuotationRow[];

  const stats = {
    total: rows.length,
    pending: rows.filter(q => q.status === "Pending").length,
    accepted: rows.filter(q => q.status === "Accepted").length,
    declined: rows.filter(q => q.status === "Declined").length,
    totalValue: rows.filter(q => q.status !== "Declined").reduce((s, q) => s + Number(q.amount), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and track client quotations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Quotation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "border-gray-400" },
          { label: "Pending", value: stats.pending, color: "border-yellow-400" },
          { label: "Accepted", value: stats.accepted, color: "border-green-500" },
          { label: "Declined", value: stats.declined, color: "border-red-400" },
        ].map(s => (
          <Card key={s.label} className={`shadow-sm border-t-4 ${s.color}`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner className="h-6 w-6" /></div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No quotations yet</p>
              <p className="text-sm mt-1">Click "New Quotation" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm font-semibold">{q.quotationNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium">{q.clientName}</div>
                        {q.location && <div className="text-xs text-gray-400">{q.location}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">{formatDate(q.date)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {q.expiryDate ? formatDate(q.expiryDate) : "—"}
                      </TableCell>
                      <TableCell className="font-semibold">{formatKES(Number(q.amount))}</TableCell>
                      <TableCell><StatusBadge status={q.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewQuotation(q)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isDirector && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isDirector && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete {q.quotationNumber} for {q.clientName}? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => deleteQuotation.mutate({ id: q.id })}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Client Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Hillarious Apartments" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Location (optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. Westlands, Nairobi" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until (optional)</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel className="block mb-2">Services</FormLabel>
                <LineItemsEditor
                  fields={createItems.fields}
                  control={createForm.control}
                  append={createItems.append}
                  remove={createItems.remove}
                  watch={createForm.watch}
                />
              </div>

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Any additional notes..." {...field} /></FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createQuotation.isPending}>
                  {createQuotation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Generate Quotation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editQuotation} onOpenChange={(o) => { if (!o) setEditQuotation(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quotation — {editQuotation?.quotationNumber}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              {isDirector ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={editForm.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Client Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Location</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Until</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="block mb-2">Services</FormLabel>
                    <LineItemsEditor
                      fields={editItems.fields}
                      control={editForm.control}
                      append={editItems.append}
                      remove={editItems.remove}
                      watch={editForm.watch}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea rows={2} {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 rounded p-3">
                  Associates can only view quotations. Contact a director to make changes.
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditQuotation(null)}>Cancel</Button>
                {isDirector && (
                  <Button type="submit" disabled={updateQuotation.isPending}>
                    {updateQuotation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Save Changes
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View / Print Dialog */}
      {viewQuotation && (
        <Dialog open={!!viewQuotation} onOpenChange={(o) => { if (!o) setViewQuotation(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {viewQuotation.quotationNumber}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[65vh]">
              <QuotationPreview q={viewQuotation} />
            </div>
            <div className="print-only">
              <QuotationPreview q={viewQuotation} isPrint />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewQuotation(null)}>Close</Button>
              <Button onClick={() => window.print()} className="bg-primary text-white">
                <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
