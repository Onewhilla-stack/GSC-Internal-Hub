import { useState } from "react";
import { useListClients, useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Search } from "lucide-react";
import { useLocation } from "wouter";

const STATUSES = ["New", "Existing", "Referral"];

const clientSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  location: z.string().optional(),
  status: z.string().min(1, "Status required"),
});

export default function Clients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: clients, isLoading } = useListClients({ 
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined
  });
  
  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      status: "New",
    }
  });

  const createClient = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Client added successfully" });
      }
    }
  });

  function onSubmit(data: z.infer<typeof clientSchema>) {
    createClient.mutate({ data });
  }

  const exportCSV = () => {
    if (!clients) return;
    const headers = ["ID", "Name", "Phone", "Email", "Location", "Status", "First Visit", "Created"];
    const rows = clients.map(c => [
      c.clientCode, c.name, c.phone || "", c.email || "", c.location || "", c.status, c.firstVisitDate || "", c.createdAt
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gsc-clients-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Client Database</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!clients?.length} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-black hover:bg-secondary/90 gap-2">
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={createClient.isPending} className="w-full">
                    {createClient.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null} Save Client
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search clients..." 
                className="pl-9 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white">ID</TableHead>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Contact</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">First Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24"><Spinner /></TableCell></TableRow>
                ) : clients?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">No clients found</TableCell></TableRow>
                ) : (
                  clients?.map(client => (
                    <TableRow 
                      key={client.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setLocation(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-mono text-sm text-gray-500">{client.clientCode}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{client.phone || "-"}</div>
                        <div className="text-xs text-gray-500">{client.email || ""}</div>
                      </TableCell>
                      <TableCell>{client.location || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {client.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{client.firstVisitDate ? formatDate(client.firstVisitDate) : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
