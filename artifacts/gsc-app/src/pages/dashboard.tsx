import { useState } from "react";
import { useGetDashboardStats, useGetDailyRevenue, useGetRevenueByService, useGetWorkerDashboard, useListJobs, useCreateJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, Activity, Banknote, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import * as z from "zod";

export default function Dashboard() {
  const { isDirector, user } = useAuth();
  return isDirector ? <DirectorDashboard /> : <WorkerDashboard username={user?.username ?? "worker"} />;
}

// Local-time YYYY-MM (avoids UTC off-by-one around month boundaries).
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Director Dashboard ────────────────────────────────────────────────────
function DirectorDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ month });
  const { data: dailyRev } = useGetDailyRevenue({ month });
  const { data: serviceRev } = useGetRevenueByService({ month });
  const COLORS = ['#29ABE2', '#F5C518', '#000000', '#888888', '#E22929'];

  if (statsLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={stats?.revenue || 0} change={stats?.revenueChange || 0} icon={Banknote} isCurrency />
        <StatCard title="Total Expenses" value={stats?.expenses || 0} change={stats?.expensesChange || 0} icon={Activity} isCurrency />
        <StatCard title="Net Profit" value={stats?.netProfit || 0} change={stats?.netProfitChange || 0} icon={TrendingUp} isCurrency />
        <StatCard title="Total Jobs" value={stats?.jobCount || 0} change={stats?.jobCountChange || 0} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-primary text-lg">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRev || []}>
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val}`} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#29ABE2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-primary text-lg">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {serviceRev && serviceRev.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceRev} dataKey="revenue" nameKey="serviceType" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                    {serviceRev.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatKES(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, isCurrency = false }: { title: string; value: number; change: number; icon: React.ComponentType<{ className?: string }>; isCurrency?: boolean }) {
  const isPositive = change >= 0;
  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="p-2 bg-gray-50 rounded-md">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {isCurrency ? formatKES(value) : value}
          </h3>
          <div className="flex items-center mt-1">
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Worker Dashboard ──────────────────────────────────────────────────────
const SERVICES = ["Laundry", "Carpet Cleaning", "Fumigation", "Sofa/Upholstery", "Deep Cleaning", "Car Wash", "Duvet Cleaning", "Curtain Cleaning", "Mattress Cleaning", "Office Cleaning", "Post-Renovation Cleaning", "General Cleaning", "Other"];

const jobSchema = z.object({
  date: z.string().min(1),
  clientName: z.string().min(1, "Client name required"),
  serviceType: z.string().min(1, "Service required"),
  location: z.string().optional(),
  amount: z.coerce.number().min(0),
  teamMembers: z.coerce.number().min(1),
});

function WorkerDashboard({ username }: { username: string }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 7);
  const { data: jobs, isLoading } = useListJobs({ month: today });

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
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ month: today }) });
        form.reset({ ...form.getValues(), clientName: "", amount: 0, location: "" });
      }
    }
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayJobs = jobs?.filter(j => j.date === todayStr) ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-black to-gray-900 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {username} 👋</h1>
        <p className="text-gray-400 mt-1 text-sm">You have {todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""} logged today</p>
      </div>

      <Card className="border-t-4 border-t-primary shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Log New Job</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createJob.mutate({ data }))} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="Client name..." {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem><FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                    <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Location..." {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="teamMembers" render={({ field }) => (
                <FormItem><FormLabel>Team Size</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl></FormItem>
              )} />
              <Button type="submit" disabled={createJob.isPending} className="bg-secondary text-black hover:bg-secondary/90 lg:col-span-3">
                {createJob.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                LOG JOB
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-primary text-lg">Today's Jobs</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white">Client</TableHead>
                <TableHead className="text-white">Service</TableHead>
                <TableHead className="text-white">Location</TableHead>
                <TableHead className="text-white">Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Spinner /></TableCell></TableRow>
              ) : todayJobs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-gray-500">No jobs logged today</TableCell></TableRow>
              ) : (
                todayJobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.clientName}</TableCell>
                    <TableCell>{job.serviceType}</TableCell>
                    <TableCell>{job.location ?? "—"}</TableCell>
                    <TableCell>{job.teamMembers}</TableCell>
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
