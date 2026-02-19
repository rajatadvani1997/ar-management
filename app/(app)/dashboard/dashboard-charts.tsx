"use client";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RISK_COLORS = { SAFE: "#22c55e", WATCHLIST: "#eab308", HIGH_RISK: "#ef4444" };
const STATUS_COLORS: Record<string, string> = {
  UNPAID: "#6b7280",
  PARTIAL: "#3b82f6",
  PAID: "#22c55e",
  OVERDUE: "#ef4444",
  WRITTEN_OFF: "#a855f7",
};

interface Props {
  riskDistribution: { name: string; value: number }[];
  invoiceStatusMap: Record<string, number>;
}

export function DashboardCharts({ riskDistribution, invoiceStatusMap }: Props) {
  const statusData = Object.entries(invoiceStatusMap).map(([status, count]) => ({
    name: status,
    count,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {riskDistribution.length === 0 ? (
            <p className="text-sm text-gray-500">No customers yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count">
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
