"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface AgingChartData {
  name: string;
  amount: number;
  color: string;
}

export function AgingCharts({ agingChartData }: { agingChartData: AgingChartData[] }) {
  const filtered = agingChartData.filter((d) => d.amount > 0);

  return (
    <Card>
      <CardHeader><CardTitle>Aging Summary</CardTitle></CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No outstanding balances</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agingChartData} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {agingChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
