import { useGetDashboardStats, useGetDailyRevenue, useGetRevenueByService } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, Activity, Banknote, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Spinner } from "@/components/ui/spinner";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: dailyRev } = useGetDailyRevenue();
  const { data: serviceRev } = useGetRevenueByService();

  const COLORS = ['#29ABE2', '#F5C518', '#000000', '#888888', '#E22929'];

  if (statsLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
        <div className="text-sm font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full border shadow-sm">
          Current Month
        </div>
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
            <CardTitle className="text-primary text-lg">Daily Revenue (This Month)</CardTitle>
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
                    {serviceRev.map((entry, index) => (
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

function StatCard({ title, value, change, icon: Icon, isCurrency = false }: any) {
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
