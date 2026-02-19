import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { calculateAging } from "@/lib/business/aging";
import { AgingChartsLoader as AgingCharts } from "./aging-charts-loader";
import { RISK_FLAG_CONFIG } from "@/lib/utils";

export default async function ReportsPage() {
  const [agingData, outstandingCustomers, promiseStats] = await Promise.all([
    calculateAging(),
    prisma.customer.findMany({
      where: { outstandingAmt: { gt: 0 }, isActive: true },
      orderBy: { outstandingAmt: "desc" },
      take: 10,
      select: {
        id: true, customerCode: true, name: true,
        outstandingAmt: true, overdueAmt: true, creditLimit: true, riskFlag: true,
      },
    }),
    Promise.all([
      prisma.promiseDate.count({ where: { status: "PENDING" } }),
      prisma.promiseDate.count({ where: { status: "KEPT" } }),
      prisma.promiseDate.count({ where: { status: "BROKEN" } }),
    ]),
  ]);

  const [pending, kept, broken] = promiseStats;
  const total = pending + kept + broken;

  // Aging summary
  const agingSummary = agingData.reduce(
    (acc, c) => {
      acc.current += c.buckets.current;
      acc.bucket30 += c.buckets.bucket30;
      acc.bucket60 += c.buckets.bucket60;
      acc.bucket90 += c.buckets.bucket90;
      acc.bucket90Plus += c.buckets.bucket90Plus;
      return acc;
    },
    { current: 0, bucket30: 0, bucket60: 0, bucket90: 0, bucket90Plus: 0 }
  );

  const agingChartData = [
    { name: "Current", amount: agingSummary.current, color: "#22c55e" },
    { name: "1-30 days", amount: agingSummary.bucket30, color: "#eab308" },
    { name: "31-60 days", amount: agingSummary.bucket60, color: "#f97316" },
    { name: "61-90 days", amount: agingSummary.bucket90, color: "#ef4444" },
    { name: "90+ days", amount: agingSummary.bucket90Plus, color: "#7c3aed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-500">Accounts Receivable Analytics</p>
      </div>

      {/* Promise Performance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Pending Promises</p>
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Kept Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {total > 0 ? Math.round((kept / total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Broken Promises</p>
            <p className="text-2xl font-bold text-red-600">{broken}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Chart */}
      <AgingCharts agingChartData={agingChartData} />

      {/* Aging Table */}
      <Card>
        <CardHeader><CardTitle>Aging Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 font-medium text-gray-600">Customer</th>
                  <th className="text-right py-2 font-medium text-gray-600">Current</th>
                  <th className="text-right py-2 font-medium text-gray-600">1-30 days</th>
                  <th className="text-right py-2 font-medium text-gray-600">31-60 days</th>
                  <th className="text-right py-2 font-medium text-gray-600">61-90 days</th>
                  <th className="text-right py-2 font-medium text-gray-600">90+ days</th>
                  <th className="text-right py-2 font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {agingData.filter((a) => a.buckets.total > 0).map((a) => (
                  <tr key={a.customerId} className="border-b hover:bg-gray-50">
                    <td className="py-2">{a.customerName} <span className="text-xs text-gray-400">{a.customerCode}</span></td>
                    <td className="py-2 text-right text-green-600">{formatCurrency(a.buckets.current)}</td>
                    <td className="py-2 text-right text-yellow-600">{formatCurrency(a.buckets.bucket30)}</td>
                    <td className="py-2 text-right text-orange-600">{formatCurrency(a.buckets.bucket60)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(a.buckets.bucket90)}</td>
                    <td className="py-2 text-right text-purple-600 font-medium">{formatCurrency(a.buckets.bucket90Plus)}</td>
                    <td className="py-2 text-right font-bold">{formatCurrency(a.buckets.total)}</td>
                  </tr>
                ))}
                {agingData.filter((a) => a.buckets.total > 0).length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">No outstanding amounts</td></tr>
                )}
              </tbody>
              <tfoot className="border-t bg-gray-50 font-bold text-sm">
                <tr>
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-green-600">{formatCurrency(agingSummary.current)}</td>
                  <td className="py-2 text-right text-yellow-600">{formatCurrency(agingSummary.bucket30)}</td>
                  <td className="py-2 text-right text-orange-600">{formatCurrency(agingSummary.bucket60)}</td>
                  <td className="py-2 text-right text-red-600">{formatCurrency(agingSummary.bucket90)}</td>
                  <td className="py-2 text-right text-purple-600">{formatCurrency(agingSummary.bucket90Plus)}</td>
                  <td className="py-2 text-right">{formatCurrency(Object.values(agingSummary).reduce((s, v) => s + v, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Outstanding */}
      <Card>
        <CardHeader><CardTitle>Top Outstanding Customers</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 font-medium text-gray-600">Customer</th>
                <th className="text-right py-2 font-medium text-gray-600">Outstanding</th>
                <th className="text-right py-2 font-medium text-gray-600">Overdue</th>
                <th className="text-right py-2 font-medium text-gray-600">Credit Used</th>
                <th className="text-left py-2 font-medium text-gray-600">Risk</th>
              </tr>
            </thead>
            <tbody>
              {outstandingCustomers.map((c) => {
                const rc = RISK_FLAG_CONFIG[c.riskFlag];
                const utilPct = c.creditLimit > 0 ? Math.round((c.outstandingAmt / c.creditLimit) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(c.outstandingAmt)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(c.overdueAmt)}</td>
                    <td className="py-2 text-right">{utilPct}%</td>
                    <td className="py-2">
                      <span className={`text-xs rounded-full px-2 py-0.5 ${rc.className}`}>{rc.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
