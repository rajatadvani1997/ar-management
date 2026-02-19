import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, PAYMENT_MODE_LABELS, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import { ReAllocateButton } from "./re-allocate-button";
import { DeletePaymentButton } from "./delete-button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pencil } from "lucide-react";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      allocations: { include: { invoice: true } },
    },
  });

  if (!payment) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{payment.paymentNumber}</h1>
          <Link href={`/customers/${payment.customerId}`} className="text-gray-500 hover:underline">
            {payment.customer.name}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${payment.status === "APPLIED" ? "text-green-600" : payment.status === "PARTIAL" ? "text-blue-600" : "text-orange-600"}`}>
            {payment.status}
          </span>
          {role !== "VIEWER" && (
            <Link href={`/payments/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Button>
            </Link>
          )}
          {payment.status !== "APPLIED" && (
            <ReAllocateButton paymentId={id} />
          )}
          {role === "ADMIN" && (
            <DeletePaymentButton paymentId={id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
        <div><p className="text-gray-400">Date</p><p className="font-medium">{formatDate(payment.paymentDate)}</p></div>
        <div><p className="text-gray-400">Mode</p><p className="font-medium">{PAYMENT_MODE_LABELS[payment.paymentMode]}</p></div>
        {payment.referenceNumber && <div><p className="text-gray-400">Reference</p><p className="font-medium">{payment.referenceNumber}</p></div>}
        {payment.bankName && <div><p className="text-gray-400">Bank</p><p className="font-medium">{payment.bankName}</p></div>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400">Total Amount</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400">Allocated</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(payment.allocatedAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-400">Unallocated</p>
          <p className={`text-xl font-bold ${payment.unallocatedAmount > 0 ? "text-orange-600" : "text-gray-400"}`}>{formatCurrency(payment.unallocatedAmount)}</p>
        </CardContent></Card>
      </div>

      {payment.allocations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invoice Allocations</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Invoice #</th>
                  <th className="text-left py-2 font-medium text-gray-600">Due Date</th>
                  <th className="text-right py-2 font-medium text-gray-600">Invoice Total</th>
                  <th className="text-right py-2 font-medium text-gray-600">Allocated</th>
                  <th className="text-left py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {payment.allocations.map((alloc) => {
                  const sc = INVOICE_STATUS_CONFIG[alloc.invoice.status];
                  return (
                    <tr key={alloc.id} className="border-b">
                      <td className="py-2">
                        <Link href={`/invoices/${alloc.invoiceId}`} className="text-blue-600 hover:underline">
                          {alloc.invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2 text-gray-500">{formatDate(alloc.invoice.dueDate)}</td>
                      <td className="py-2 text-right">{formatCurrency(alloc.invoice.totalAmount)}</td>
                      <td className="py-2 text-right font-medium text-green-600">{formatCurrency(alloc.amount)}</td>
                      <td className="py-2">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${sc.className}`}>{sc.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {payment.notes && (
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500 font-medium mb-1">Notes</p>
          <p className="text-sm">{payment.notes}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
