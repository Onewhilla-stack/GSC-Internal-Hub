import { useState, useRef } from "react";
import { useListClients, useCreateClient, useUpdateClient, useDeleteClient, useImportClients, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Search, Pencil, Trash2, Upload, X, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import Papa from "papaparse";
import { parseDateToISO, normalizeStatus, findHeader, col, cell } from "@/lib/csv-import";

const STATUSES = ["New", "Existing", "Referral"];

const clientSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  location: z.string().optional(),
  status: z.string().min(1, "Status required"),
});

type ClientFormData = z.infer<typeof clientSchema>;

type PreviewRow = {
  clientCode?: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  status: string;
  firstVisitDate?: string;
};

export default function Clients() {
  const { isDirector } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<{ id: number; clientCode: string; name: string } & ClientFormData | null>(null);

  // CSV import preview state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");

  const { data: clients, isLoading } = useListClients({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", phone: "", email: "", location: "", status: "New" }
  });

  const editForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", phone: "", email: "", location: "", status: "New" }
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

  const updateClient = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setEditClient(null);
        toast({ title: "Client updated" });
      }
    }
  });

  const deleteClient = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client removed" });
      }
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importClients = useImportClients({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setImportPreviewOpen(false);
        setPreviewRows([]);
        toast({ title: `Imported ${res.imported} clients${res.errors ? ` (${res.errors} skipped)` : ""}` });
      },
      onError: () => toast({ title: "Import failed", variant: "destructive" }),
    }
  });

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as string[][];
        const header = findHeader(data, [/name/i]);
        if (!header) {
          toast({ title: "Couldn't find a header row with a Name column", variant: "destructive" });
          return;
        }
        const { headerIndex, columns } = header;
        const codeIdx = col(columns, ["client id", "id", "code"]);
        const nameIdx = col(columns, ["client name", "name"]);
        const phoneIdx = col(columns, ["phone", "contact"]);
        const emailIdx = col(columns, ["email"]);
        const locationIdx = col(columns, ["location", "address"]);
        const statusIdx = col(columns, ["status"]);
        const firstVisitIdx = col(columns, ["first visit", "first contact", "date"]);

        const rows: PreviewRow[] = [];
        for (let i = headerIndex + 1; i < data.length; i++) {
          const r = data[i];
          const name = cell(r, nameIdx);
          if (!name || /total/i.test(name)) continue;
          rows.push({
            clientCode: cell(r, codeIdx) || undefined,
            name,
            phone: cell(r, phoneIdx) || undefined,
            email: cell(r, emailIdx) || undefined,
            location: cell(r, locationIdx) || undefined,
            status: normalizeStatus(cell(r, statusIdx)),
            firstVisitDate: parseDateToISO(cell(r, firstVisitIdx)) ?? undefined,
          });
        }
        if (rows.length === 0) {
          toast({ title: "No valid client rows found in CSV", variant: "destructive" });
          return;
        }
        setPreviewRows(rows);
        setImportPreviewOpen(true);
      }
    });
    e.target.value = "";
  }

  function confirmImport() {
    if (previewRows.length === 0) return;
    importClients.mutate({ data: { rows: previewRows } });
  }

  function removePreviewRow(idx: number) {
    setPreviewRows(prev => prev.filter((_, i) => i !== idx));
  }

  function updatePreviewStatus(idx: number, status: string) {
    setPreviewRows(prev => prev.map((r, i) => i === idx ? { ...r, status } : r));
  }

  const exportCSV = () => {
    if (!clients) return;
    const headers = ["ID", "Name", "Phone", "Email", "Location", "Status", "First Visit", "Added By"];
    const rows = clients.map(c => [
      c.clientCode, c.name, c.phone || "", c.email || "", c.location || "", c.status, c.firstVisitDate || "", (c as any).createdBy || ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gsc-clients-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function openEdit(c: NonNullable<typeof clients>[0]) {
    editForm.reset({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", location: c.location ?? "", status: c.status });
    setEditClient({ id: c.id, clientCode: c.clientCode, name: c.name, phone: c.phone ?? "", email: c.email ?? "", location: c.location ?? "", status: c.status });
  }

  const colCount = isDirector ? 8 : 6;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Client Database</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          {isDirector && (
            <Button variant="outline" onClick={exportCSV} disabled={!clients?.length} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-black hover:bg-secondary/90 gap-2">
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createClient.mutate({ data }))} className="space-y-4 pt-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
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

      {/* CSV Import Preview Dialog */}
      <Dialog open={importPreviewOpen} onOpenChange={(o) => { if (!o) { setImportPreviewOpen(false); setPreviewRows([]); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Import Preview
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between text-sm text-gray-500 pb-2 border-b">
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{csvFileName}</span>
            <span><span className="font-semibold text-gray-800">{previewRows.length}</span> clients ready to import</span>
          </div>

          <p className="text-sm text-gray-500">
            Review the rows below before importing. You can fix the status or remove any row you don't want.
          </p>

          <div className="overflow-auto flex-1 border rounded-md">
            <Table>
              <TableHeader className="bg-black sticky top-0">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">First Visit</TableHead>
                  <TableHead className="text-white w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-16 text-gray-400">
                      All rows removed
                    </TableCell>
                  </TableRow>
                ) : (
                  previewRows.map((row, idx) => (
                    <TableRow key={idx} className="group">
                      <TableCell className="font-medium">
                        {row.name}
                        {row.clientCode && (
                          <span className="ml-2 font-mono text-xs text-gray-400">{row.clientCode}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{row.phone || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{row.location || "—"}</TableCell>
                      <TableCell>
                        <Select value={row.status} onValueChange={(val) => updatePreviewStatus(idx, val)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {row.firstVisitDate ? formatDate(row.firstVisitDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removePreviewRow(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-2">
            <p className="text-xs text-gray-400 flex-1">
              Clients with matching names will be created as new entries. Existing codes in your CSV are preserved.
            </p>
            <Button variant="outline" onClick={() => { setImportPreviewOpen(false); setPreviewRows([]); }}>
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importClients.isPending || previewRows.length === 0}
              className="bg-primary text-white gap-2"
            >
              {importClients.isPending ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              Import {previewRows.length} Client{previewRows.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search clients..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  {isDirector && <TableHead className="text-white">Added By</TableHead>}
                  {isDirector && <TableHead className="text-white text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={colCount} className="text-center h-24"><Spinner /></TableCell></TableRow>
                ) : clients?.length === 0 ? (
                  <TableRow><TableCell colSpan={colCount} className="text-center h-24 text-gray-500">No clients found</TableCell></TableRow>
                ) : (
                  clients?.map(client => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-mono text-sm text-gray-500" onClick={() => setLocation(`/clients/${client.id}`)}>{client.clientCode}</TableCell>
                      <TableCell className="font-medium" onClick={() => setLocation(`/clients/${client.id}`)}>{client.name}</TableCell>
                      <TableCell onClick={() => setLocation(`/clients/${client.id}`)}>
                        <div className="text-sm">{client.phone || "—"}</div>
                        <div className="text-xs text-gray-500">{client.email || ""}</div>
                      </TableCell>
                      <TableCell onClick={() => setLocation(`/clients/${client.id}`)}>{client.location || "—"}</TableCell>
                      <TableCell onClick={() => setLocation(`/clients/${client.id}`)}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{client.status}</span>
                      </TableCell>
                      <TableCell className="text-sm" onClick={() => setLocation(`/clients/${client.id}`)}>{client.firstVisitDate ? formatDate(client.firstVisitDate) : "—"}</TableCell>
                      {isDirector && (
                        <TableCell className="text-xs text-gray-400">
                          {(client as any).createdBy ?? "—"}
                        </TableCell>
                      )}
                      {isDirector && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(client); }}>
                              <Pencil className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove {client.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove the client record and cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteClient.mutate({ id: client.id })}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(o) => !o && setEditClient(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editClient?.name} ({editClient?.clientCode})</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateClient.mutate({ id: editClient!.id, data }))} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={editForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={editForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditClient(null)}>Cancel</Button>
                <Button type="submit" disabled={updateClient.isPending} className="bg-primary text-white">
                  {updateClient.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null} Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
