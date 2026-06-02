import { useParams, useLocation } from "wouter";
import { useGetClient, useUpdateClient, getGetClientQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Printer, Phone, Mail, MapPin, Calendar, Clock } from "lucide-react";
import { useState } from "react";

const STATUSES = ["New", "Existing", "Referral"];

const updateSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  location: z.string().optional(),
  status: z.string().min(1, "Status required"),
});

export default function ClientProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const clientId = Number(id);

  const { data: profile, isLoading } = useGetClient(clientId, {
    query: {
      enabled: !!clientId && !isNaN(clientId),
      queryKey: getGetClientQueryKey(clientId)
    }
  });

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    values: {
      name: profile?.client.name || "",
      phone: profile?.client.phone || "",
      email: profile?.client.email || "",
      location: profile?.client.location || "",
      status: profile?.client.status || "New",
    }
  });

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
        setIsEditOpen(false);
        toast({ title: "Client updated" });
      }
    }
  });

  if (isLoading || !profile) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const { client, stats, transactions } = profile;

  function onSubmit(data: z.infer<typeof updateSchema>) {
    updateClient.mutate({ id: clientId, data });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Client Profile</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={updateClient.isPending} className="w-full">
                    {updateClient.isPending ? <Spinner className="mr-2" /> : null} Save Changes
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={handlePrint} className="bg-secondary text-black hover:bg-secondary/90 gap-2">
            <Printer className="h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="print-only bg-white p-8 absolute inset-0 text-black">
        <h1 className="text-3xl font-bold text-primary mb-2">GOLD STANDARD CLEANERS</h1>
        <h2 className="text-xl mb-8">Client Profile: {client.clientCode}</h2>
        <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-8">
          <div>
            <p><strong>Name:</strong> {client.name}</p>
            <p><strong>Phone:</strong> {client.phone}</p>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Location:</strong> {client.location}</p>
          </div>
          <div>
            <p><strong>Total Spent:</strong> {formatKES(stats.totalSpent)}</p>
            <p><strong>Total Visits:</strong> {stats.totalVisits}</p>
            <p><strong>First Visit:</strong> {stats.firstVisitDate ? formatDate(stats.firstVisitDate) : "-"}</p>
            <p><strong>Last Visit:</strong> {stats.lastVisitDate ? formatDate(stats.lastVisitDate) : "-"}</p>
          </div>
        </div>
        <h3 className="font-bold mb-4">Transaction History</h3>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="pb-2">Date</th><th className="pb-2">Service</th><th className="pb-2 text-right">Amount</th></tr></thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b"><td className="py-2">{formatDate(t.date)}</td><td className="py-2">{t.serviceType}</td><td className="py-2 text-right">{formatKES(t.amount)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <Card className="md:col-span-1 shadow-sm border-t-4 border-t-secondary">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-full text-primary font-bold text-xl h-16 w-16 flex items-center justify-center">
                {client.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                <div className="text-sm font-mono text-gray-500">{client.clientCode}</div>
              </div>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3"><Phone className="h-4 w-4 text-gray-400 mt-0.5" /> <span>{client.phone || "No phone"}</span></div>
              <div className="flex items-start gap-3"><Mail className="h-4 w-4 text-gray-400 mt-0.5" /> <span className="break-all">{client.email || "No email"}</span></div>
              <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /> <span>{client.location || "No location"}</span></div>
            </div>
            
            <div className="mt-8 pt-6 border-t space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> First Visit</span>
                <span className="font-medium">{stats.firstVisitDate ? formatDate(stats.firstVisitDate) : "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Clock className="h-4 w-4" /> Last Visit</span>
                <span className="font-medium">{stats.lastVisitDate ? formatDate(stats.lastVisitDate) : "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Total Spent</div>
                <div className="font-bold text-lg text-primary">{formatKES(stats.totalSpent)}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Total Visits</div>
                <div className="font-bold text-lg">{stats.totalVisits}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Avg Spend</div>
                <div className="font-bold text-lg">{formatKES(stats.averageSpend)}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Fav Service</div>
                <div className="font-bold text-sm truncate">{stats.favouriteService || "-"}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-gray-500">No transactions</TableCell></TableRow>
                  ) : (
                    transactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.date)}</TableCell>
                        <TableCell>{t.serviceType}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{t.description || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatKES(t.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
