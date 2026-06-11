import React, { useState, useRef } from "react";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, useImportJobs, useGetSettings, useListReceipts, getListJobsQueryKey, getListClientsQueryKey, getListReceiptsQueryKey, getGetReceiptsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { useForm, useFieldArray } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2, ReceiptText, Upload, Plus, ExternalLink, Printer, ChevronUp, ChevronDown, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge, worstStatus } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range";
import { DateRangePicker } from "@/components/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { parseJobCsvRows } from "@/lib/csv-import";

const SERVICES = ["Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery", "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning", "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning", "General Cleaning", "Other"];

const jobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  clientPhone: z.string().optional(),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  amount: z.coerce.number().min(0, "Invalid amount"),
  teamMembers: z.coerce.number().min(0, "Cannot be negative"),
  items: z.array(z.object({
    serviceType: z.string().min(1, "Service required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
  })).optional(),
}).superRefine((data, ctx) => {
  if (!data.items || data.items.length === 0) {
    if (!data.serviceType || data.serviceType.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["serviceType"], message: "Service required" });
    }
  }
});

type JobFormData = z.infer<typeof jobSchema>;

const editJobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  location: z.string().optional(),
  teamMembers: z.coerce.number().min(0, "Cannot be negative"),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  items: z.array(z.object({
    serviceType: z.string().min(1, "Service required"),
    description: z.string().optional(),
    amount: z.coerce.number().min(0),
  })).optional(),
});

type EditJobFormData = z.infer<typeof editJobSchema>;

type ImportRow = { date: string; clientName: string; serviceType: string; description?: string; location?: string; amount: number; teamMembers: number };

export default function Jobs() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { from, to, applyPreset } = useDateRange();
  const [editJob, setEditJob] = useState<{ id: number } | null>(null);
  const [syncReceipts, setSyncReceipts] = useState(true);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: jobs, isLoading } = useListJobs({ from, to });
  const jobsKey = getListJobsQueryKey({ from, to });

  // Receipts can be generated from a job and carry its jobId. We load them so the
  // edit dialog can offer to keep a linked receipt in sync when services change.
  const { data: allReceipts } = useListReceipts({});
  const linkedReceipts = (allReceipts ?? []).filter((r) => r.jobId === editJob?.id);

  function invalidateReceipts() {
    queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetReceiptsSummaryQueryKey() });
  }

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      clientName: "",
      clientPhone: "",
      serviceType: "",
      description: "",
      location: "",
      amount: 0,
      teamMembers: 1,
    }
  });

  const createItemsArray = useFieldArray({ control: form.control, name: "items" });
  const createItemsWatch = form.watch("items") ?? [];
  const isMultiCreate = createItemsWatch.length > 0;

  const editForm = useForm<EditJobFormData>({
    resolver: zodResolver(editJobSchema),
    defaultValues: { date: "", clientName: "", serviceType: "", description: "", location: "", amount: 0, teamMembers: 1, items: [] },
  });
  const editItemsArray = useFieldArray({ control: editForm.control, name: "items" });
  const editItems = editForm.watch("items") ?? [];
  const isMultiEdit = editItems.length > 0;
  const editTeamMembers = editForm.watch("teamMembers");
  const editAmount = editForm.watch("amount");

  const createJob = useCreateJob({
    mutation: {
      onSuccess: (_data, vars) => {
        // Switch to "this-month" if the logged job is in the current month so it
        // becomes visible immediately even when the filter was showing last month.
        const jobDate: string = (vars as { data?: { date?: string } })?.data?.date ?? "";
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (jobDate.startsWith(currentMonthPrefix)) applyPreset("this-month");
        queryClient.invalidateQueries();
        form.reset({ ...form.getValues(), clientName: "", clientPhone: "", amount: 0, location: "", description: "", serviceType: "", items: [] });
        toast({ title: "Job logged successfully" });
      }
    }
  });

  const updateJob = useUpdateJob({
    mutation: {
      onSuccess: (_data, vars) => {
        const synced = !!(vars?.data as { syncReceipts?: boolean } | undefined)?.syncReceipts;
        queryClient.invalidateQueries();
        setEditJob(null);
        toast({ title: synced ? "Job updated — linked receipt synced" : "Job updated" });
      }
    }
  });

  const deleteJob = useDeleteJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Job deleted" });
      },
      onError: () => toast({ title: "Delete failed — please try again", variant: "destructive" }),
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importJobs = useImportJobs({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries();
        setImportPreview(null);
        toast({ title: `Imported ${res.imported} jobs${res.errors ? ` (${res.errors} skipped)` : ""}` });
      },
      onError: () => toast({ title: "Import failed", variant: "destructive" }),
    }
  });

  function updatePreviewRow(idx: number, patch: Partial<ImportRow>) {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function removePreviewRow(idx: number) {
    if (!importPreview) return;
    const removedRow = importPreview[idx];
    if (!removedRow) return;

    const next = importPreview.filter((_, i) => i !== idx);
    setImportPreview(next.length === 0 ? null : next);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const { dismiss } = toast({
      title: "Row removed",
      description: `${removedRow.clientName} — ${removedRow.serviceType}`,
      duration: 5000,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            if (undoTimerRef.current) {
              clearTimeout(undoTimerRef.current);
              undoTimerRef.current = null;
            }
            setImportPreview((current) => {
              const base = current ?? next;
              const restored = [...base];
              restored.splice(idx, 0, removedRow);
              return restored;
            });
            dismiss();
          }}
        >
          Undo
        </ToastAction>
      ),
    });

    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      dismiss();
    }, 5000);
  }

  function movePreviewRow(idx: number, direction: "up" | "down") {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = parseJobCsvRows(result.data as string[][]);
        if (!parsed.ok) {
          toast({ title: parsed.error, variant: "destructive" });
          return;
        }
        if (parsed.skippedZeroAmount > 0) {
          const n = parsed.skippedZeroAmount;
          toast({
            title: `${n} ${n === 1 ? "row" : "rows"} skipped — amount was 0 or blank`,
          });
        }
        setImportPreview(parsed.rows);
      }
    });
    e.target.value = "";
  }

  const { data: settings } = useGetSettings();
  const wageRate = settings?.wagePerPersonPerDay ?? 1000;

  const amount = form.watch("amount");
  const teamMembers = form.watch("teamMembers");
  const wages = (Number(teamMembers) || 0) * wageRate;
  const createTotal = isMultiCreate
    ? createItemsWatch.reduce((s, it) => s + (Number(it?.amount) || 0), 0)
    : (Number(amount) || 0);
  const netIncome = createTotal - wages;

  function convertCreateToMulti() {
    const cur = form.getValues();
    createItemsArray.replace([
      { serviceType: cur.serviceType || "", description: cur.description || "", amount: Number(cur.amount) || 0 },
      { serviceType: "", description: "", amount: 0 },
    ]);
  }

  function collapseCreateToSingle() {
    const only = (form.getValues("items") ?? [])[0];
    form.setValue("serviceType", only?.serviceType ?? "");
    form.setValue("description", only?.description ?? "");
    form.setValue("amount", Number(only?.amount) || 0);
    createItemsArray.replace([]);
  }

  function exportCSV() {
    if (!jobs?.length) return;
    const headers = ["Date", "Client", "Phone", "Location", "Service", "Description", "Amount (KES)", "Team", "Wages (KES)", "Net Income (KES)"];
    const rows = (jobs as any[]).map(j => [
      j.date,
      `"${(j.clientName ?? "").replace(/"/g, '""')}"`,
      j.clientPhone ?? "",
      `"${(j.location ?? "").replace(/"/g, '""')}"`,
      `"${(j.serviceType ?? "").replace(/"/g, '""')}"`,
      `"${(j.description ?? "").replace(/"/g, '""')}"`,
      j.amount,
      j.teamMembers,
      j.wages,
      j.netIncome,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gsc-jobs-${from ?? "all"}.csv`;
    link.click();
  }

  function submitCreate(data: JobFormData) {
    const { items, serviceType, amount: amt, ...rest } = data;
    if (items && items.length > 0) {
      createJob.mutate({ data: { ...rest, items } });
    } else {
      createJob.mutate({ data: { ...rest, serviceType: serviceType!, amount: amt } });
    }
  }

  const editTotal = isMultiEdit
    ? editItems.reduce((s, it) => s + (Number(it?.amount) || 0), 0)
    : (Number(editAmount) || 0);
  const editWages = (Number(editTeamMembers) || 0) * wageRate;
  const editNetIncome = editTotal - editWages;

  // Mirror what the server stores for imported jobs: wages = teamMembers × the
  // configured rate (no "at least 1" default — an omitted team column means 0
  // wages on the server), and net income = amount − wages.
  const previewRows = (importPreview ?? []).map((row) => {
    const wages = row.teamMembers * wageRate;
    return { ...row, wages, netIncome: row.amount - wages };
  });
  const previewTotals = previewRows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, wages: acc.wages + r.wages, netIncome: acc.netIncome + r.netIncome }),
    { amount: 0, wages: 0, netIncome: 0 },
  );

  function openEdit(job: typeof jobs extends (infer T)[] | undefined ? T : never) {
    const jobItems = job!.items ?? [];
    editForm.reset({
      date: job!.date,
      clientName: job!.clientName,
      serviceType: job!.serviceType,
      location: job!.location ?? "",
      amount: job!.amount,
      teamMembers: job!.teamMembers,
      description: job!.description ?? "",
      items: jobItems.map(it => ({ serviceType: it.serviceType, description: it.description ?? "", amount: it.amount })),
    });
    setSyncReceipts(true);
    setEditJob({ id: job!.id });
  }

  function convertToMulti() {
    const cur = editForm.getValues();
    editItemsArray.replace([
      { serviceType: cur.serviceType || "", description: cur.description || "", amount: Number(cur.amount) || 0 },
      { serviceType: "", description: "", amount: 0 },
    ]);
  }

  function collapseToSingle() {
    const only = (editForm.getValues("items") ?? [])[0];
    editForm.setValue("serviceType", only?.serviceType ?? "");
    editForm.setValue("description", only?.description ?? "");
    editForm.setValue("amount", Number(only?.amount) || 0);
    editItemsArray.replace([]);
  }

  function submitEdit(data: EditJobFormData) {
    const { items, serviceType, amount, ...rest } = data;
    // Only ask the API to sync receipts when this job actually has a linked one
    // and the director left the offer checked.
    const sync = linkedReceipts.length > 0 && syncReceipts;
    if (items && items.length > 0) {
      updateJob.mutate({ id: editJob!.id, data: { ...rest, items, syncReceipts: sync } });
    } else {
      // Explicit null clears any stored line items, collapsing back to a single service.
      updateJob.mutate({ id: editJob!.id, data: { ...rest, serviceType, amount, items: null, syncReceipts: sync } });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Job Tracker</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          <Button variant="outline" className="gap-2" disabled={importJobs.isPending} onClick={() => fileInputRef.current?.click()}>
            {importJobs.isPending ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Import CSV
          </Button>
          <Button variant="outline" className="gap-2" disabled={!jobs?.length} onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <DateRangePicker />
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-sm bg-white">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCreate)} className="space-y-4">
              {/* Row 1: Date, Client, Phone, Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="clientName" render={({ field }) => (
                  <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="Name..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="clientPhone" render={({ field }) => (
                  <FormItem><FormLabel>Client Phone</FormLabel><FormControl><Input type="tel" placeholder="07xx xxx xxx" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g. Westlands, Nairobi" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
              </div>

              {/* Row 2: Single-service fields (hidden in multi-service mode) */}
              {!isMultiCreate && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                  <FormField control={form.control} name="serviceType" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Service</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem className="lg:col-span-2"><FormLabel>Details</FormLabel><FormControl><Input placeholder="e.g. 5×6 duvet, 5-seater, 8kg..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                  )} />
                  <Button type="button" variant="outline" size="sm" className="gap-1 self-end" onClick={convertCreateToMulti}>
                    <Plus className="h-3.5 w-3.5" /> Add service
                  </Button>
                </div>
              )}

              {/* Multi-service rows */}
              {isMultiCreate && (
                <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Services</span>
                    <div className="flex items-center gap-2">
                      {createItemsArray.fields.length === 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={collapseCreateToSingle}>
                          Single service
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => createItemsArray.append({ serviceType: "", description: "", amount: 0 })}>
                        <Plus className="h-3.5 w-3.5" /> Add service
                      </Button>
                    </div>
                  </div>
                  {createItemsArray.fields.map((f, idx) => (
                    <div key={f.id} className="flex items-end gap-3">
                      <FormField control={form.control} name={`items.${idx}.serviceType`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Service</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                            <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${idx}.description`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Details</FormLabel><FormControl><Input placeholder="e.g. 5×6 duvet..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`items.${idx}.amount`} render={({ field }) => (
                        <FormItem className="w-28"><FormLabel className="text-xs">Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" disabled={createItemsArray.fields.length === 1} onClick={() => createItemsArray.remove(idx)} title="Remove">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3: Team, Wages, Net Income, Submit */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                <FormField control={form.control} name="teamMembers" render={({ field }) => (
                  <FormItem><FormLabel>Team Members</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                )} />
                <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-500">Auto Wages</div>
                  <div className="font-mono text-sm text-red-600">{formatKES(wages)}</div>
                </div>
                {isDirector && (
                  <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                    <div className="text-xs text-gray-500">Net Income</div>
                    <div className="font-mono text-sm text-green-600 font-bold">{formatKES(netIncome)}</div>
                  </div>
                )}
                <Button type="submit" disabled={createJob.isPending} className={`bg-secondary text-black hover:bg-secondary/90 w-full col-span-2 ${isDirector ? "lg:col-span-3" : "lg:col-span-4"}`}>
                  {createJob.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  LOG JOB
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Client</TableHead>
                <TableHead className="text-white">Service</TableHead>
                {isDirector && <TableHead className="text-white text-right">Amount</TableHead>}
                {isDirector && <TableHead className="text-white text-right">Wages</TableHead>}
                {isDirector && <TableHead className="text-secondary font-bold text-right">Net</TableHead>}
                <TableHead className="text-white">Location</TableHead>
                {isDirector && <TableHead className="text-white text-center">By</TableHead>}
                {isDirector && <TableHead className="text-white text-right">Actions</TableHead>}
                <TableHead className="text-white text-center">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isDirector ? 10 : 5} className="text-center h-24"><Spinner /></TableCell></TableRow>
              ) : jobs?.length === 0 ? (
                <TableRow><TableCell colSpan={isDirector ? 10 : 5} className="text-center h-24 text-gray-500">No jobs recorded for this period</TableCell></TableRow>
              ) : (
                jobs?.map(job => {
                  const jobReceipts = (allReceipts ?? []).filter((r) => r.jobId === job.id);
                  return (
                  <TableRow key={job.id}>
                    <TableCell>{formatDate(job.date)}</TableCell>
                    <TableCell className="font-medium">{job.clientName}</TableCell>
                    <TableCell>
                      {job.serviceType}
                      {(job.items?.length ?? 0) > 1 && (
                        <div className="text-xs text-gray-400">{job.items!.map(it => it.serviceType).join(", ")}</div>
                      )}
                    </TableCell>
                    {isDirector && <TableCell className="text-right font-mono">{formatKES(job.amount)}</TableCell>}
                    {isDirector && <TableCell className="text-right font-mono text-red-600">{formatKES(job.wages)}</TableCell>}
                    {isDirector && <TableCell className="text-right font-mono font-bold text-green-600">{formatKES(job.netIncome)}</TableCell>}
                    <TableCell className="text-gray-500 text-sm">{job.location ?? "—"}</TableCell>
                    {isDirector && (
                      <TableCell className="text-center">
                        <span className="text-xs text-gray-400">
                          {(job as any).createdBy ?? "—"}
                        </span>
                      </TableCell>
                    )}
                    {isDirector && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(job)} title="Edit job">
                            <Pencil className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          {(() => {
                            return (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                                    <AlertDialogDescription>This cannot be undone. The job for {job.clientName} on {formatDate(job.date)} will be permanently removed.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  {jobReceipts.length > 0 && (
                                    <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                                      This job has {jobReceipts.length} linked receipt{jobReceipts.length > 1 ? "s" : ""}{" "}
                                      <span className="font-mono text-xs">({jobReceipts.map((r) => r.receiptNumber).join(", ")})</span>.
                                      {" "}The receipt{jobReceipts.length > 1 ? "s" : ""} will be kept but no longer linked to this job.
                                    </div>
                                  )}
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteJob.mutate({ id: job.id })}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            );
                          })()}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {jobReceipts.length > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="relative h-7 w-7"
                              title="Receipted — view or generate"
                            >
                              <ReceiptText className="h-3.5 w-3.5 text-[#F5C518] fill-[#F5C518]/30" />
                              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">
                                {jobReceipts.length}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[200px]">
                            {jobReceipts.map((r) => (
                              <React.Fragment key={r.id}>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => navigate(`/receipts?viewId=${encodeURIComponent(r.receiptNumber)}`)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="font-mono text-xs">{r.receiptNumber}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => navigate(`/receipts?printId=${encodeURIComponent(r.receiptNumber)}`)}
                                >
                                  <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs">Print {r.receiptNumber}</span>
                                </DropdownMenuItem>
                              </React.Fragment>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  client: job.clientName,
                                  date: job.date.split("T")[0],
                                  jobId: String(job.id),
                                });
                                if (job.items && job.items.length > 0) {
                                  params.set("items", JSON.stringify(job.items.map(it => ({ serviceType: it.serviceType, description: it.description ?? "", amount: it.amount }))));
                                } else {
                                  params.set("items", JSON.stringify([{ serviceType: job.serviceType, description: job.description ?? "", amount: job.amount }]));
                                }
                                navigate(`/receipts?${params.toString()}`);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              Generate new receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isDirector && (() => {
                          const worst = worstStatus(jobReceipts.map((r) => r.paymentStatus ?? "Pending"));
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default">
                                    <StatusBadge status={worst} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs space-y-1 max-w-[180px]">
                                  {jobReceipts.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between gap-2">
                                      <span className="font-mono">{r.receiptNumber}</span>
                                      <StatusBadge status={r.paymentStatus ?? "Pending"} />
                                    </div>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-7 w-7"
                                title="Generate receipt"
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    client: job.clientName,
                                    date: job.date.split("T")[0],
                                    jobId: String(job.id),
                                  });
                                  if (job.items && job.items.length > 0) {
                                    params.set("items", JSON.stringify(job.items.map(it => ({ serviceType: it.serviceType, description: it.description ?? "", amount: it.amount }))));
                                  } else {
                                    params.set("items", JSON.stringify([{ serviceType: job.serviceType, description: job.description ?? "", amount: job.amount }]));
                                  }
                                  navigate(`/receipts?${params.toString()}`);
                                }}
                              >
                                <ReceiptText className="h-3.5 w-3.5 text-[#F5C518]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Generate receipt</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editJob} onOpenChange={(o) => !o && setEditJob(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="clientName" render={({ field }) => (
                  <FormItem><FormLabel>Client</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                {!isMultiEdit && (
                  <FormField control={editForm.control} name="serviceType" render={({ field }) => (
                    <FormItem><FormLabel>Service</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
                {!isMultiEdit && (
                  <FormField control={editForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Details</FormLabel><FormControl><Input placeholder="e.g. 5×6 duvet..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                )}
                <FormField control={editForm.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="teamMembers" render={({ field }) => (
                  <FormItem><FormLabel>Team</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                )} />
                {!isMultiEdit && (
                  <FormField control={editForm.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                  )} />
                )}
              </div>
              {!isMultiEdit && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={convertToMulti}>
                  <Plus className="h-3.5 w-3.5" /> Add another service
                </Button>
              )}
              {isMultiEdit && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Services</span>
                    <div className="flex items-center gap-2">
                      {editItemsArray.fields.length === 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={collapseToSingle}>
                          Switch to single service
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => editItemsArray.append({ serviceType: "", description: "", amount: 0 })}>
                        <Plus className="h-3.5 w-3.5" /> Add service
                      </Button>
                    </div>
                  </div>
                  {editItemsArray.fields.map((f, idx) => (
                    <div key={f.id} className="flex items-end gap-3">
                      <FormField control={editForm.control} name={`items.${idx}.serviceType`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Service</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                            <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name={`items.${idx}.description`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Details</FormLabel><FormControl><Input placeholder="e.g. 5×6 duvet..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={editForm.control} name={`items.${idx}.amount`} render={({ field }) => (
                        <FormItem className="w-28"><FormLabel className="text-xs">Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" disabled={editItemsArray.fields.length === 1} onClick={() => editItemsArray.remove(idx)} title="Remove service">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-mono text-sm font-semibold text-primary">{formatKES(editTotal)}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-500">Auto Wages</div>
                  <div className="font-mono text-sm text-red-600">{formatKES(editWages)}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                  <div className="text-xs text-gray-500">Net Income</div>
                  <div className="font-mono text-sm text-green-600 font-bold">{formatKES(editNetIncome)}</div>
                </div>
              </div>
              {linkedReceipts.length > 0 && (
                <label className="flex items-start gap-2 rounded-md border border-secondary/40 bg-secondary/10 p-3 cursor-pointer">
                  <Checkbox
                    checked={syncReceipts}
                    onCheckedChange={(c) => setSyncReceipts(c === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">
                    Also update the receipt{linkedReceipts.length > 1 ? "s" : ""} generated from this job
                    {" "}
                    <span className="font-mono text-xs text-gray-500">
                      ({linkedReceipts.map((r) => r.receiptNumber).join(", ")})
                    </span>{" "}
                    so the total and services match.
                  </span>
                </label>
              )}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditJob(null)}>Cancel</Button>
                <Button type="submit" disabled={updateJob.isPending} className="bg-primary text-white">
                  {updateJob.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null} Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview */}
      <Dialog open={!!importPreview} onOpenChange={(o) => { if (!o && !importJobs.isPending) setImportPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review import — {previewRows.length} job{previewRows.length === 1 ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black sticky top-0">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Client</TableHead>
                  <TableHead className="text-white">Service</TableHead>
                  <TableHead className="text-white text-center">Team</TableHead>
                  {isDirector && <TableHead className="text-white text-right">Amount</TableHead>}
                  {isDirector && <TableHead className="text-white text-right">Wages</TableHead>}
                  {isDirector && <TableHead className="text-secondary font-bold text-right">Net</TableHead>}
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                    <TableCell className="font-medium text-sm">{r.clientName}</TableCell>
                    <TableCell className="min-w-[150px]">
                      <Select
                        value={r.serviceType}
                        onValueChange={(val) => updatePreviewRow(i, { serviceType: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-16 text-center text-xs"
                        value={r.teamMembers}
                        onChange={(e) => updatePreviewRow(i, { teamMembers: parseInt(e.target.value, 10) || 0 })}
                      />
                    </TableCell>
                    {isDirector && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-28 text-right text-xs font-mono"
                          value={r.amount}
                          onChange={(e) => updatePreviewRow(i, { amount: parseFloat(e.target.value) || 0 })}
                        />
                      </TableCell>
                    )}
                    {isDirector && <TableCell className="text-right font-mono text-sm text-red-600">{formatKES(r.wages)}</TableCell>}
                    {isDirector && <TableCell className="text-right font-mono text-sm font-bold text-green-600">{formatKES(r.netIncome)}</TableCell>}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700"
                          onClick={() => movePreviewRow(i, "up")}
                          disabled={i === 0}
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-gray-700"
                          onClick={() => movePreviewRow(i, "down")}
                          disabled={i === previewRows.length - 1}
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                          onClick={() => removePreviewRow(i)}
                          title="Remove this row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isDirector && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="font-mono text-sm font-semibold text-primary">{formatKES(previewTotals.amount)}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500">Total Wages</div>
                <div className="font-mono text-sm text-red-600">{formatKES(previewTotals.wages)}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500">Total Net Income</div>
                <div className="font-mono text-sm text-green-600 font-bold">{formatKES(previewTotals.netIncome)}</div>
              </div>
            </div>
          )}
          {isDirector && (
            <p className="text-xs text-gray-500">
              Wages are calculated at {formatKES(wageRate)} per team member per day (from Settings).
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" disabled={importJobs.isPending} onClick={() => setImportPreview(null)}>Cancel</Button>
            <Button
              type="button"
              disabled={importJobs.isPending}
              className="bg-secondary text-black hover:bg-secondary/90"
              onClick={() => { if (importPreview) importJobs.mutate({ data: { rows: importPreview } }); }}
            >
              {importJobs.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Import {previewRows.length} job{previewRows.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
