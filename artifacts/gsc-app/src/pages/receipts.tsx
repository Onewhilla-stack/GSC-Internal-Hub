import { useState } from "react";
import { useListReceipts, useCreateReceipt, useListJobs, getListReceiptsQueryKey } from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import { Printer } from "lucide-react";

const receiptSchema = z.object({
  jobId: z.coerce.number().optional().nullable(),
  clientName: z.string().min(1, "Client required"),
  serviceType: z.string().min(1, "Service required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Invalid amount"),
  date: z.string().min(1, "Date required"),
});

export default function Receipts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  
  const { data: receipts, isLoading: receiptsLoading } = useListReceipts();
  const { data: jobs } = useListJobs({});
  
  const form = useForm<z.infer<typeof receiptSchema>>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      jobId: null,
      clientName: "",
      serviceType: "",
      description: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    }
  });

  const createReceipt = useCreateReceipt({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        setSelectedReceipt(data);
        form.reset({
          jobId: null,
          clientName: "",
          serviceType: "",
          description: "",
          amount: 0,
          date: new Date().toISOString().split('T')[0],
        });
        toast({ title: "Receipt generated" });
      }
    }
  });

  function onSubmit(data: z.infer<typeof receiptSchema>) {
    createReceipt.mutate({ data });
  }

  const handleJobSelect = (jobIdStr: string) => {
    if (jobIdStr === "manual") {
      form.setValue("jobId", null);
      return;
    }
    
    const jobId = parseInt(jobIdStr, 10);
    const job = jobs?.find(j => j.id === jobId);
    if (job) {
      form.setValue("jobId", job.id);
      form.setValue("clientName", job.clientName);
      form.setValue("serviceType", job.serviceType);
      form.setValue("description", job.description || "");
      form.setValue("amount", job.amount);
      form.setValue("date", job.date.split('T')[0]);
    }
  };

  const printReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const previewData = {
    ...form.watch(),
    receiptNumber: selectedReceipt?.receiptNumber || "GSC-RCT-PREVIEW",
    date: form.watch("date") || new Date().toISOString().split('T')[0],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Receipts</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">Generate Receipt</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Auto-fill from Job</label>
              <Select onValueChange={handleJobSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job or enter manually..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  {jobs?.slice(0, 50).map(j => (
                    <SelectItem key={j.id} value={j.id.toString()}>
                      {formatDate(j.date)} - {j.clientName} ({j.serviceType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="clientName" render={({ field }) => (
                  <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem><FormLabel>Service Type</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <Button type="submit" disabled={createReceipt.isPending} className="w-full bg-secondary text-black hover:bg-secondary/90 mt-4">
                  {createReceipt.isPending ? <Spinner className="mr-2" /> : null} Generate Receipt
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <div className="bg-gray-100 p-8 rounded-lg flex items-center justify-center border border-gray-200">
          <div className="bg-white p-8 w-full max-w-sm shadow-lg print:shadow-none print:p-0 print:m-0" id="receipt-preview">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary tracking-tighter">GOLD STANDARD</h2>
              <h2 className="text-xl font-bold text-primary tracking-tighter mb-1">CLEANERS</h2>
              <p className="text-xs font-bold text-secondary tracking-widest uppercase">Home Cleaning Experts</p>
              <div className="mt-4 text-xs text-gray-600 space-y-1">
                <p>Ngong Road, Nairobi</p>
                <p>Tel: +254 700 000 000</p>
                <p>Email: info@goldstandard.co.ke</p>
              </div>
            </div>
            
            <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Receipt No:</span><span className="font-mono font-medium">{previewData.receiptNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{formatDate(previewData.date)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Client:</span><span className="font-medium text-right">{previewData.clientName || "—"}</span></div>
            </div>
            
            <div className="mb-6 space-y-3">
              <div>
                <div className="text-xs text-gray-500">Service</div>
                <div className="font-medium">{previewData.serviceType || "—"}</div>
              </div>
              {previewData.description && (
                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="text-sm">{previewData.description}</div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-800 pt-4 flex justify-between items-center mt-auto">
              <span className="font-bold">TOTAL</span>
              <span className="text-xl font-bold font-mono">{formatKES(previewData.amount || 0)}</span>
            </div>
            
            <div className="text-center mt-8 text-xs text-gray-400 italic">
              Thank you for your business!
            </div>
          </div>
        </div>
      </div>

      <div className="print-only fixed inset-0 bg-white z-[100] flex justify-center p-8">
        <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black tracking-tighter">GOLD STANDARD</h2>
              <h2 className="text-xl font-bold text-black tracking-tighter mb-1">CLEANERS</h2>
              <p className="text-xs font-bold text-black tracking-widest uppercase">Home Cleaning Experts</p>
              <div className="mt-4 text-xs text-black space-y-1">
                <p>Ngong Road, Nairobi</p>
                <p>Tel: +254 700 000 000</p>
                <p>Email: info@goldstandard.co.ke</p>
              </div>
            </div>
            
            <div className="border-t border-b border-dashed border-black py-4 mb-4 text-sm space-y-2">
              <div className="flex justify-between"><span>Receipt No:</span><span className="font-mono font-medium">{selectedReceipt?.receiptNumber}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{selectedReceipt ? formatDate(selectedReceipt.date) : ""}</span></div>
              <div className="flex justify-between"><span>Client:</span><span className="font-medium text-right">{selectedReceipt?.clientName}</span></div>
            </div>
            
            <div className="mb-6 space-y-3">
              <div>
                <div className="text-xs">Service</div>
                <div className="font-medium">{selectedReceipt?.serviceType}</div>
              </div>
              {selectedReceipt?.description && (
                <div>
                  <div className="text-xs">Description</div>
                  <div className="text-sm">{selectedReceipt?.description}</div>
                </div>
              )}
            </div>
            
            <div className="border-t border-black pt-4 flex justify-between items-center mt-auto">
              <span className="font-bold">TOTAL</span>
              <span className="text-xl font-bold font-mono">{formatKES(selectedReceipt?.amount || 0)}</span>
            </div>
            
            <div className="text-center mt-8 text-xs italic">
              Thank you for your business!
            </div>
        </div>
      </div>

      <Card className="shadow-sm no-print">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white">Receipt #</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Client</TableHead>
                <TableHead className="text-white">Service</TableHead>
                <TableHead className="text-white text-right">Amount</TableHead>
                <TableHead className="text-white text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receiptsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Spinner /></TableCell></TableRow>
              ) : receipts?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">No receipts generated</TableCell></TableRow>
              ) : (
                receipts?.map(receipt => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-xs">{receipt.receiptNumber}</TableCell>
                    <TableCell>{formatDate(receipt.date || receipt.createdAt)}</TableCell>
                    <TableCell className="font-medium">{receipt.clientName}</TableCell>
                    <TableCell>{receipt.serviceType}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatKES(receipt.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => printReceipt(receipt)}>
                        <Printer className="h-4 w-4 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
