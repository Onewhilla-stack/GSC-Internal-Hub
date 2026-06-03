import { useState, useRef } from "react";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, useImportJobs, useGetSettings, useListReceipts, getListJobsQueryKey, getListReceiptsQueryKey, getGetReceiptsSummaryQueryKey } from "@workspace/api-client-react";
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
import { Pencil, Trash2, ReceiptText, Upload, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDateRange } from "@/lib/date-range";
import { DateRangePicker } from "@/components/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { parseKES, parseDateToISO, normalizeService, findHeader, col, cell } from "@/lib/csv-import";

const SERVICES = ["Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery", "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning", "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning", "General Cleaning", "Other"];

const jobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  clientPhone: z.string().optional(),
  serviceType: z.string().min(1, "Service required"),
  description: z.string().optional(),
  location: z.string().optional(),
  amount: z.coerce.number().min(0, "Invalid amount"),
  teamMembers: z.coerce.number().min(1, "At least 1 member"),
});

type JobFormData = z.infer<typeof jobSchema>;

const editJobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  location: z.string().optional(),
  teamMembers: z.coerce.number().min(1, "At least 1 member"),
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

export default function Jobs() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { from, to } = useDateRange();
  const [editJob, setEditJob] = useState<{ id: number } | null>(null);
  const [syncReceipts, setSyncReceipts] = useState(true);
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: jobsKey });
        form.reset({ ...form.getValues(), clientName: "", clientPhone: "", amount: 0, location: "", description: "" });
        toast({ title: "Job logged successfully" });
      }
    }
  });

  const updateJob = useUpdateJob({
    mutation: {
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({ queryKey: jobsKey });
        const synced = !!(vars?.data as { syncReceipts?: boolean } | undefined)?.syncReceipts;
        if (synced) invalidateReceipts();
        setEditJob(null);
        toast({ title: synced ? "Job updated — linked receipt synced" : "Job updated" });
      }
    }
  });

  const deleteJob = useDeleteJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: jobsKey });
        toast({ title: "Job deleted" });
      }
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importJobs = useImportJobs({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: jobsKey });
        toast({ title: `Imported ${res.imported} jobs${res.errors ? ` (${res.errors} skipped)` : ""}` });
      },
      onError: () => toast({ title: "Import failed", variant: "destructive" }),
    }
  });

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as string[][];
        const header = findHeader(data, [/date/i, /client|customer/i]);
        if (!header) {
          toast({ title: "Couldn't find a header row with Date and Client columns", variant: "destructive" });
          return;
        }
        const { headerIndex, columns } = header;
        const dateIdx = col(columns, ["date"]);
        const clientIdx = col(columns, ["client name", "client", "customer"]);
        const serviceIdx = col(columns, ["service type", "service", "description"]);
        const amountIdx = col(columns, ["amount", "cost", "price"]);
        const locationIdx = col(columns, ["location", "client location"]);
        const teamIdx = col(columns, ["team"]);

        const rows: Array<{ date: string; clientName: string; serviceType: string; description?: string; location?: string; amount: number; teamMembers: number }> = [];
        for (let i = headerIndex + 1; i < data.length; i++) {
          const r = data[i];
          const clientName = cell(r, clientIdx);
          if (!clientName || /^expense/i.test(clientName) || /total/i.test(clientName)) continue;
          const serviceRaw = cell(r, serviceIdx);
          if (/^expense$/i.test(serviceRaw)) continue;
          const date = parseDateToISO(cell(r, dateIdx));
          if (!date) continue;
          const teamRaw = cell(r, teamIdx);
          rows.push({
            date,
            clientName,
            serviceType: normalizeService(serviceRaw),
            description: serviceRaw || undefined,
            location: cell(r, locationIdx) || undefined,
            amount: parseKES(cell(r, amountIdx)),
            teamMembers: teamRaw ? (parseInt(teamRaw, 10) || 0) : 0,
          });
        }
        if (rows.length === 0) {
          toast({ title: "No valid job rows found in CSV", variant: "destructive" });
          return;
        }
        importJobs.mutate({ data: { rows } });
      }
    });
    e.target.value = "";
  }

  const { data: settings } = useGetSettings();
  const wageRate = settings?.wagePerPersonPerDay ?? 1000;

  const amount = form.watch("amount");
  const teamMembers = form.watch("teamMembers");
  const wages = (teamMembers || 1) * wageRate;
  const netIncome = (amount || 0) - wages;

  const editTotal = isMultiEdit
    ? editItems.reduce((s, it) => s + (Number(it?.amount) || 0), 0)
    : (Number(editAmount) || 0);
  const editWages = (Number(editTeamMembers) || 1) * wageRate;
  const editNetIncome = editTotal - editWages;

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
          <DateRangePicker />
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-sm bg-white">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createJob.mutate({ data }))} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem className="lg:col-span-2"><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="Name..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientPhone" render={({ field }) => (
                <FormItem className="lg:col-span-2"><FormLabel>Client Phone</FormLabel><FormControl><Input type="tel" placeholder="07xx xxx xxx" {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem className="lg:col-span-2"><FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="lg:col-span-2"><FormLabel>Details</FormLabel><FormControl><Input placeholder="e.g. 5×6 duvet, 5-seater, 8kg..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="teamMembers" render={({ field }) => (
                <FormItem><FormLabel>Team</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
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
              <Button type="submit" disabled={createJob.isPending} className={`bg-secondary text-black hover:bg-secondary/90 w-full ${isDirector ? "lg:col-span-2" : "lg:col-span-3"}`}>
                {createJob.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                LOG JOB
              </Button>
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
                jobs?.map(job => (
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
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteJob.mutate({ id: job.id })}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
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
                            // Single-service job: description lives on the job itself,
                            // so carry it through as a one-item list (not service/amount
                            // alone) or the receipt loses the details.
                            params.set("items", JSON.stringify([{ serviceType: job.serviceType, description: job.description ?? "", amount: job.amount }]));
                          }
                          navigate(`/receipts?${params.toString()}`);
                        }}
                      >
                        <ReceiptText className="h-3.5 w-3.5 text-[#F5C518]" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
                  <FormItem><FormLabel>Team</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
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
    </div>
  );
}
