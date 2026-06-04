import { useState } from "react";
import { 
  useGetPLSummary, 
  useGetRevenueTrend, 
  useGetKeyStats,
  useGetMonthDrill,
  getGetMonthDrillQueryKey,
} from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LabelList } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const COLORS = ['#29ABE2', '#F5C518', '#000000', '#888888', '#E22929', '#333333'];

type DeltaLabelProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
};

// Renders a month-over-month change indicator at the end of each bar:
// green ▲ for growth, red ▼ for decline, gray – when unchanged.
function renderDeltaLabel(props: DeltaLabelProps) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  const fill = value > 0 ? "#16a34a" : value < 0 ? "#E22929" : "#888888";
  const text = value > 0 ? `▲ +${value}` : value < 0 ? `▼ ${value}` : "– 0";
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill={fill}
      fontSize={11}
      fontWeight={600}
      textAnchor="start"
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

type RevenueDeltaLabelProps = DeltaLabelProps & { value?: number | null };

// Renders a KES revenue change indicator (e.g. ▲ +12k or ▼ -5k) at the end of
// each revenue bar. Shows nothing when no prior-month data exists (null delta).
function renderRevenueDeltaLabel(props: RevenueDeltaLabelProps) {
  const { x = 0, y = 0, width = 0, height = 0, value } = props;
  if (value === null || value === undefined) return <text />;
  const fill = value > 0 ? "#16a34a" : value < 0 ? "#E22929" : "#888888";
  const absK = Math.abs(value) >= 1000
    ? `${(Math.abs(value) / 1000).toFixed(1)}k`
    : String(Math.abs(value));
  const text = value > 0 ? `▲ +${absK}` : value < 0 ? `▼ -${absK}` : "– 0";
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill={fill}
      fontSize={11}
      fontWeight={600}
      textAnchor="start"
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

export default function Analytics() {
  const [drillMonth, setDrillMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { data: plSummary, isLoading: plLoading } = useGetPLSummary();
  const { data: revTrend } = useGetRevenueTrend();
  const { data: keyStats, isLoading: statsLoading } = useGetKeyStats();
  const { data: monthDrill } = useGetMonthDrill({ month: drillMonth }, { query: { enabled: !!drillMonth, queryKey: getGetMonthDrillQueryKey({ month: drillMonth }) } });

  const expBreakdown = monthDrill?.expenseBreakdown ?? [];
  const serviceCounts = keyStats?.serviceCounts ?? [];
  const monthServiceCounts = monthDrill?.serviceCounts ?? [];
  // Revenue per service with month-over-month delta — computed server-side via
  // aggregateRevenueByService so multi-service line items are attributed correctly.
  const serviceRevenue = monthDrill?.serviceRevenue ?? [];

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

      <Card className="shadow-sm border-t-4 border-t-secondary">
        <CardHeader>
          <CardTitle>Most Popular Services (All Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex justify-center h-24 items-center"><Spinner /></div>
          ) : serviceCounts.length > 0 ? (
            <div style={{ height: Math.max(serviceCounts.length * 44, 120) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceCounts} layout="vertical" margin={{ left: 40, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                  <YAxis dataKey="serviceType" type="category" tickLine={false} axisLine={false} tick={{fontSize: 12}} width={120} />
                  <Tooltip formatter={(val: number) => [`${val} ${val === 1 ? "time" : "times"}`, "Performed"]} />
                  <Bar dataKey="count" fill="#29ABE2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center text-gray-500 h-24">No jobs recorded yet</div>
          )}
        </CardContent>
      </Card>

      <div className="pt-6 border-t-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Month Drill-Down</h2>
          <Input type="month" value={drillMonth} onChange={(e) => setDrillMonth(e.target.value)} className="w-48 bg-white" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle>Most Popular Services ({drillMonth})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {monthServiceCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthServiceCounts} layout="vertical" margin={{ left: 40, right: 64 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                    <YAxis dataKey="serviceType" type="category" tickLine={false} axisLine={false} tick={{fontSize: 11}} width={100} />
                    <Tooltip
                      formatter={(val: number, _name, item) => {
                        const delta = (item?.payload as { delta?: number } | undefined)?.delta ?? 0;
                        const change = delta > 0 ? `+${delta} vs. last month` : delta < 0 ? `${delta} vs. last month` : "no change vs. last month";
                        return [`${val} ${val === 1 ? "time" : "times"} (${change})`, "Performed"];
                      }}
                    />
                    <Bar dataKey="count" fill="#29ABE2" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="delta" content={renderDeltaLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center text-gray-500 h-full">No jobs recorded this month</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle>Revenue by Service ({drillMonth})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {serviceRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceRevenue} layout="vertical" margin={{ left: 40, right: 72 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                    <YAxis dataKey="serviceType" type="category" tickLine={false} axisLine={false} tick={{fontSize: 11}} width={100} />
                    <Tooltip
                      formatter={(val: number, _name, item) => {
                        const delta = (item?.payload as { revenueDelta?: number | null } | undefined)?.revenueDelta;
                        if (delta === null || delta === undefined) {
                          return [formatKES(val), "Revenue"];
                        }
                        const changeStr = delta > 0
                          ? `+${formatKES(delta)} vs. last month`
                          : delta < 0
                          ? `${formatKES(delta)} vs. last month`
                          : "no change vs. last month";
                        return [`${formatKES(val)} (${changeStr})`, "Revenue"];
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F5C518" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="revenueDelta" content={renderRevenueDeltaLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center text-gray-500 h-full">No jobs recorded this month</div>
              )}
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
