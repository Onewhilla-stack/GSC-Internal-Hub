import { useState } from "react";
import { 
  useGetPLSummary, 
  useGetRevenueTrend, 
  useGetServiceBreakdown, 
  useGetExpenseBreakdown, 
  useGetKeyStats,
  useGetMonthDrill
} from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const COLORS = ['#29ABE2', '#F5C518', '#000000', '#888888', '#E22929', '#333333'];

export default function Analytics() {
  const [drillMonth, setDrillMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { data: plSummary, isLoading: plLoading } = useGetPLSummary();
  const { data: revTrend } = useGetRevenueTrend();
  const { data: serviceBreakdown } = useGetServiceBreakdown({ month: drillMonth });
  const { data: expBreakdown } = useGetExpenseBreakdown({ month: drillMonth });
  const { data: keyStats, isLoading: statsLoading } = useGetKeyStats();
  const { data: monthDrill } = useGetMonthDrill(drillMonth, { query: { enabled: !!drillMonth } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-primary">Business Analytics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatBox title="Best Revenue" value={keyStats?.bestMonthByRevenue || "-"} loading={statsLoading} />
        <StatBox title="Best Profit" value={keyStats?.bestMonthByProfit || "-"} loading={statsLoading} />
        <StatBox title="Top Service" value={keyStats?.mostPopularService || "-"} loading={statsLoading} />
        <StatBox title="Top Client" value={keyStats?.topClientAllTime || "-"} loading={statsLoading} />
        <StatBox title="Avg / Job" value={keyStats ? formatKES(keyStats.avgRevenuePerJob) : "-"} loading={statsLoading} highlight />
        <StatBox title="Avg Profit" value={keyStats ? formatKES(keyStats.avgMonthlyProfit) : "-"} loading={statsLoading} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend (All Time)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {revTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `KES ${val/1000}k`} tick={{fontSize: 12}} />
                  <Tooltip formatter={(val: number) => formatKES(val)} />
                  <Line type="monotone" dataKey="revenue" stroke="#29ABE2" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Spinner />}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>P&L Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-72">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right font-bold text-black">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24"><Spinner /></TableCell></TableRow>
                ) : (
                  plSummary?.map(row => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(row.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{formatKES(row.expenses)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">{formatKES(row.netProfit)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Month Drill-Down</h2>
          <Input type="month" value={drillMonth} onChange={(e) => setDrillMonth(e.target.value)} className="w-48 bg-white" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle>Revenue by Service ({drillMonth})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {serviceBreakdown ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceBreakdown} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" tickFormatter={(val) => `${val/1000}k`} />
                    <YAxis dataKey="serviceType" type="category" tickLine={false} axisLine={false} tick={{fontSize: 11}} width={100} />
                    <Tooltip formatter={(val: number) => formatKES(val)} />
                    <Bar dataKey="revenue" fill="#F5C518" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Spinner />}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-black">
            <CardHeader>
              <CardTitle>Expense Breakdown ({drillMonth})</CardTitle>
            </CardHeader>
            <CardContent className="h-72 flex justify-center">
              {expBreakdown && expBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expBreakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatKES(val)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center text-gray-500">No expenses recorded</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatBox({ title, value, loading, highlight = false }: any) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-black text-white border-black' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className={`text-xs mb-1 ${highlight ? 'text-gray-400' : 'text-gray-500'}`}>{title}</div>
      <div className={`font-bold truncate ${highlight ? 'text-secondary text-lg' : 'text-primary text-base'}`}>
        {loading ? <Spinner className="h-4 w-4" /> : value}
      </div>
    </div>
  );
}
