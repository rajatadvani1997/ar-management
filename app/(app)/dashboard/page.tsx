import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { AlertTriangle, TrendingUp, Users, FileText, CreditCard, Clock } from "lucide-react";

async function getDashboardData() {
  const [
    customers,
    totalOutstanding,
    totalOverdue,
    invoiceCounts,
    recentPayments,
    riskCounts,
    promisesToday,
    brokenPromises,
  ] = await Promise.all([
    prisma.customer.count({ where: { isActive: true } }),
    prisma.invoice.aggregate({
      _sum: { balanceAmount: true },
      where: { status: { notIn: ["PAID", "WRITTEN_OFF"] } },
    }),
    prisma.invoice.aggregate({
      _sum: { balanceAmount: true },
      where: { status: "OVERDUE" },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.payment.findMany({
      where: {},
      include: { customer: { select: { name: true } } },
      orderBy: { paymentDate: "desc" },
      take: 5,
    }),
    prisma.customer.groupBy({
      by: ["riskFlag"],
      _count: { id: true },
      where: { isActive: true },
    }),
    prisma.promiseDate.count({
      where: {
        status: "PENDING",
        promisedDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    }),
    prisma.promiseDate.count({ where: { status: "BROKEN" } }),
  ]);

  return {
    customers,
    totalOutstanding: totalOutstanding._sum.balanceAmount || 0,
    totalOverdue: totalOverdue._sum.balanceAmount || 0,
    invoiceCounts,
    recentPayments,
    riskCounts,
    promisesToday,
    brokenPromises,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const kpis = [
    {
      label: "Total Outstanding",
      value: formatCurrency(data.totalOutstanding),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Overdue",
      value: formatCurrency(data.totalOverdue),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Active Customers",
      value: data.customers.toString(),
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Promises Today",
      value: data.promisesToday.toString(),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const invoiceStatusMap = Object.fromEntries(
    data.invoiceCounts.map((i) => [i.status, i._count.id])
  );

  const riskDistribution = data.riskCounts.map((r) => ({
    name: r.riskFlag,
    value: r._count.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your accounts receivable</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
                  </div>
                  <div className={`rounded-full p-3 ${kpi.bg}`}>
                    <Icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCharts riskDistribution={riskDistribution} invoiceStatusMap={invoiceStatusMap} />

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{p.customer.name}</p>
                      <p className="text-gray-400">{p.paymentNumber} · {p.paymentMode}</p>
                    </div>
                    <p className="font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(data.totalOverdue > 0 || data.brokenPromises > 0) && (
        <div className="space-y-2">
          {data.totalOverdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {formatCurrency(data.totalOverdue)} in overdue invoices require immediate attention.{" "}
                <a href="/calling" className="underline">View Daily Calling List</a>
              </span>
            </div>
          )}
          {data.brokenPromises > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {data.brokenPromises} broken payment promise(s).{" "}
                <a href="/calling" className="underline">Follow up now</a>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
