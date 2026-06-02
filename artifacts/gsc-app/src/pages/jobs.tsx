import { useState } from "react";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ReceiptText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const SERVICES = ["Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery", "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning", "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning", "General Cleaning", "Other"];

const jobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  serviceType: z.string().min(1, "Service required"),
  location: z.string().optional(),
  amount: z.coerce.number().min(0, "Invalid amount"),
  teamMembers: z.coerce.number().min(1, "At least 1 member"),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function Jobs() {
  const { isDirector } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editJob, setEditJob] = useState<{ id: number } & JobFormData | null>(null);
  const { data: jobs, isLoading } = useListJobs({ month });

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      clientName: "",
      serviceType: "",
      location: "",
      amount: 0,
      teamMembers: 1,
    }
  });

  const editForm = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { date: "", clientName: "", serviceType: "", location: "", amount: 0, teamMembers: 1 },
  });

  const createJob = useCreateJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ month }) });
        form.reset({ ...form.getValues(), clientName: "", amount: 0, location: "" });
        toast({ title: "Job logged successfully" });
      }
    }
  });

  const updateJob = useUpdateJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ month }) });
        setEditJob(null);
        toast({ title: "Job updated" });
      }
    }
  });

  const deleteJob = useDeleteJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ month }) });
        toast({ title: "Job deleted" });
      }
    }
  });

  const amount = form.watch("amount");
  const teamMembers = form.watch("teamMembers");
  const defaultWageRate = 1000;
  const wages = (teamMembers || 1) * defaultWageRate;
  const netIncome = (amount || 0) - wages;

  function openEdit(job: typeof jobs extends (infer T)[] | undefined ? T : never) {
    editForm.reset({
      date: job!.date,
      clientName: job!.clientName,
      serviceType: job!.serviceType,
      location: job!.location ?? "",
      amount: job!.amount,
      teamMembers: job!.teamMembers,
    });
    setEditJob({ id: job!.id, date: job!.date, clientName: job!.clientName, serviceType: job!.serviceType, location: job!.location ?? "", amount: job!.amount, teamMembers: job!.teamMembers });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Job Tracker</h1>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48 bg-white" />
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
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem className="lg:col-span-2"><FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
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
                <TableRow><TableCell colSpan={isDirector ? 10 : 5} className="text-center h-24 text-gray-500">No jobs recorded for this month</TableCell></TableRow>
              ) : (
                jobs?.map(job => (
                  <TableRow key={job.id}>
                    <TableCell>{formatDate(job.date)}</TableCell>
                    <TableCell className="font-medium">{job.clientName}</TableCell>
                    <TableCell>{job.serviceType}</TableCell>
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
                            service: job.serviceType,
                            amount: String(job.amount),
                            date: job.date.split("T")[0],
                            jobId: String(job.id),
                          });
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
            <form onSubmit={editForm.handleSubmit((data) => updateJob.mutate({ id: editJob!.id, data }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="clientName" render={({ field }) => (
                  <FormItem><FormLabel>Client</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="serviceType" render={({ field }) => (
                  <FormItem><FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="teamMembers" render={({ field }) => (
                  <FormItem><FormLabel>Team</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
                )} />
              </div>
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
