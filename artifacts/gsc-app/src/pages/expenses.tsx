import { useState } from "react";
import { useListExpenses, useCreateExpense, useImportExpenses, useGetExpensesMonthlySummary, getListExpensesQueryKey, getGetExpensesMonthlySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDateRange } from "@/lib/date-range";
import { DateRangePicker } from "@/components/date-range-picker";
import { Upload, Download } from "lucide-react";
import Papa from "papaparse";
import { parseExpenseCsvRows } from "@/lib/csv-import";

const CATEGORIES = ["Labour", "Tokens/Electricity", "Cleaning Supplies", "Transport", "Rent", "Water", "Wi-Fi", "Equipment", "Fumigation Chemicals", "Other"];

const expenseSchema = z.object({
  date: z.string().min(1, "Date required"),
  category: z.string().min(1, "Category required"),
  description: z.string().min(1, "Description required"),
  amount: z.coerce.number().min(0, "Invalid amount"),
});

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { from, to } = useDateRange();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const { data: expenses, isLoading } = useListExpenses({ 
    from,
    to,
    category: categoryFilter !== "all" ? categoryFilter : undefined 
  });
  const { data: summary } = useGetExpensesMonthlySummary({ from, to }, { query: { queryKey: getGetExpensesMonthlySummaryQueryKey({ from, to }) } });
  
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      amount: 0,
    }
  });

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetExpensesMonthlySummaryQueryKey({ from, to }) });
        form.reset({
          ...form.getValues(),
          description: "",
          amount: 0,
        });
        toast({ title: "Expense logged" });
      }
    }
  });

  const importExpenses = useImportExpenses({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast({ title: `Imported ${res.imported} expenses (${res.errors} errors)` });
      }
    }
  });

  function onSubmit(data: z.infer<typeof expenseSchema>) {
    createExpense.mutate({ data });
  }

  function exportCSV() {
    if (!expenses?.length) return;
    const rows = expenses.map(e => [e.date, e.category, `"${e.description.replace(/"/g, '""')}"`, e.amount]);
    const csv = [["Date", "Category", "Description", "Amount (KES)"], ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gsc-expenses-${from ?? "all"}.csv`;
    link.click();
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = parseExpenseCsvRows(results.data as string[][]);
        if (!parsed.ok) {
          toast({ title: "Import failed", description: parsed.error, variant: "destructive" });
          return;
        }
        if (parsed.skippedZeroAmount > 0) {
          toast({ title: `Skipped ${parsed.skippedZeroAmount} row(s) with zero amount` });
        }
        importExpenses.mutate({ data: { rows: parsed.rows } });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Expenses</h1>
        <div className="flex items-center gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <DateRangePicker />
          
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={!expenses?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
            />
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-sm bg-white">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="Brief description..." {...field} /></FormControl>
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
                  
                  <Button type="submit" disabled={createExpense.isPending} className="bg-secondary text-black hover:bg-secondary/90 w-full">
                    {createExpense.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    LOG EXPENSE
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
                    <TableHead className="text-white">Category</TableHead>
                    <TableHead className="text-white">Description</TableHead>
                    <TableHead className="text-white text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24"><Spinner /></TableCell></TableRow>
                  ) : expenses?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-gray-500">No expenses recorded</TableCell></TableRow>
                  ) : (
                    expenses?.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{expense.category}</span></TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatKES(expense.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base text-gray-700">Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {summary && summary.length > 0 ? (
                <ul className="divide-y">
                  {summary.map(s => (
                    <li key={s.category} className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm font-medium">{s.category}</span>
                      <span className="text-sm font-mono text-gray-600">{formatKES(s.total)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between items-center px-4 py-3 bg-gray-50 font-bold">
                    <span>Total</span>
                    <span className="font-mono text-primary">{formatKES(summary.reduce((acc, curr) => acc + curr.total, 0))}</span>
                  </li>
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">No summary data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
