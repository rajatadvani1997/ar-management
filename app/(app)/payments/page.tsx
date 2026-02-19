import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, PAYMENT_MODE_LABELS } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status = "", search = "" } = await searchParams;

  const payments = await prisma.payment.findMany({
    where: {
      ...(status && { status: status as any }),
    },
    include: { customer: { select: { name: true, customerCode: true } } },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });

  const totalUnallocated = await prisma.payment.aggregate({
    _sum: { unallocatedAmount: true },
    where: { unallocatedAmount: { gt: 0 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500">
            {payments.length} payments ·{" "}
            <span className="text-orange-600 font-medium">
              {formatCurrency(totalUnallocated._sum.unallocatedAmount || 0)} unallocated
            </span>
          </p>
        </div>
        <Link href="/payments/new">
          <Button><Plus className="mr-2 h-4 w-4" />Record Payment</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <select name="status" defaultValue={status} className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="UNALLOCATED">Unallocated</option>
          <option value="PARTIAL">Partial</option>
          <option value="APPLIED">Applied</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        <Link href="/payments"><Button variant="ghost" size="sm">Clear</Button></Link>
      </form>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payment #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Mode</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Unallocated</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No payments found</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/payments/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.paymentNumber}</Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/customers/${p.customerId}`} className="hover:underline">{p.customer.name}</Link>
                  <div className="text-xs text-gray-400">{p.customer.customerCode}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                <td className="px-4 py-3 text-gray-500">{PAYMENT_MODE_LABELS[p.paymentMode]}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={p.unallocatedAmount > 0 ? "text-orange-600 font-medium" : "text-gray-400"}>
                    {formatCurrency(p.unallocatedAmount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${p.status === "APPLIED" ? "text-green-600" : p.status === "PARTIAL" ? "text-blue-600" : "text-orange-600"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/payments/${p.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
