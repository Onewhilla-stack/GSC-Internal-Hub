import { useState } from "react";
import { useListJobs, useCreateJob, getListJobsQueryKey } from "@workspace/api-client-react";
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

const SERVICES = ["Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery", "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning", "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning", "General Cleaning", "Other"];

const jobSchema = z.object({
  date: z.string().min(1, "Date required"),
  clientName: z.string().min(1, "Client name required"),
  serviceType: z.string().min(1, "Service required"),
  location: z.string().optional(),
  amount: z.coerce.number().min(0, "Invalid amount"),
  teamMembers: z.coerce.number().min(1, "At least 1 member"),
});

export default function Jobs() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data: jobs, isLoading } = useListJobs({ month });
  
  const form = useForm<z.infer<typeof jobSchema>>({
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

  const createJob = useCreateJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ month }) });
        form.reset({
          ...form.getValues(),
          clientName: "",
          amount: 0,
          location: "",
        });
      }
    }
  });

  const amount = form.watch("amount");
  const teamMembers = form.watch("teamMembers");
  const defaultWageRate = 1000; // Mock from settings for now
  const wages = teamMembers * defaultWageRate;
  const netIncome = amount - wages;

  function onSubmit(data: z.infer<typeof jobSchema>) {
    createJob.mutate({ data });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Job Tracker</h1>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48 bg-white" />
      </div>

      <Card className="border-t-4 border-t-primary shadow-sm bg-white">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Client Name</FormLabel>
                    <FormControl><Input placeholder="Name..." {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teamMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (KES)</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500">Auto Wages</div>
                <div className="font-mono text-sm text-red-600">{formatKES(wages)}</div>
              </div>
              
              <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                <div className="text-xs text-gray-500">Net Income</div>
                <div className="font-mono text-sm text-green-600 font-bold">{formatKES(netIncome)}</div>
              </div>

              <Button type="submit" disabled={createJob.isPending} className="bg-secondary text-black hover:bg-secondary/90 w-full lg:col-span-2">
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
                <TableHead className="text-white text-right">Amount</TableHead>
                <TableHead className="text-white text-right">Wages</TableHead>
                <TableHead className="text-secondary font-bold text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Spinner /></TableCell></TableRow>
              ) : jobs?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">No jobs recorded for this month</TableCell></TableRow>
              ) : (
                jobs?.map(job => (
                  <TableRow key={job.id}>
                    <TableCell>{formatDate(job.date)}</TableCell>
                    <TableCell className="font-medium">{job.clientName}</TableCell>
                    <TableCell>{job.serviceType}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(job.amount)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{formatKES(job.wages)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">{formatKES(job.netIncome)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
