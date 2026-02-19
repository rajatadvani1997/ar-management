import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WriteOffButton } from "./write-off-button";
import { UndoWriteOffButton } from "./undo-write-off-button";
import { DeleteInvoiceButton } from "./delete-button";
import { Pencil } from "lucide-react";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lineItems: true,
      allocations: {
        include: { payment: true },
      },
    },
  });

  if (!invoice) notFound();
  const sc = INVOICE_STATUS_CONFIG[invoice.status];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.className}`}>{sc.label}</span>
          </div>
          <Link href={`/customers/${invoice.customerId}`} className="text-gray-500 hover:underline">
            {invoice.customer.name}
          </Link>
        </div>
        <div className="flex gap-2">
          {role !== "VIEWER" && invoice.status !== "WRITTEN_OFF" && (
            <Link href={`/invoices/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Button>
            </Link>
          )}
          {role === "ADMIN" && invoice.status === "WRITTEN_OFF" && (
            <UndoWriteOffButton invoiceId={id} />
          )}
          {role === "ADMIN" && invoice.status !== "WRITTEN_OFF" && invoice.status !== "PAID" && (
            <WriteOffButton invoiceId={id} />
          )}
          {role === "ADMIN" && (
            <DeleteInvoiceButton invoiceId={id} />
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
        <div><p className="text-gray-400">Invoice Date</p><p className="font-medium">{formatDate(invoice.invoiceDate)}</p></div>
        <div><p className="text-gray-400">Due Date</p><p className="font-medium">{formatDate(invoice.dueDate)}</p></div>
        <div><p className="text-gray-400">Payment Terms</p><p className="font-medium">{invoice.paymentTermDays} days</p></div>
        {invoice.referenceNumber && <div><p className="text-gray-400">Reference</p><p className="font-medium">{invoice.referenceNumber}</p></div>}
      </div>

      {/* Amount Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Amount</span>
              <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span className="font-medium">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Balance Due</span>
              <span>{formatCurrency(invoice.balanceAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocations */}
      {invoice.allocations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment Allocations</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Payment #</th>
                  <th className="text-left py-2 font-medium text-gray-600">Date</th>
                  <th className="text-right py-2 font-medium text-gray-600">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {invoice.allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b">
                    <td className="py-2">
                      <Link href={`/payments/${alloc.paymentId}`} className="text-blue-600 hover:underline">
                        {alloc.payment.paymentNumber}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">{formatDate(alloc.payment.paymentDate)}</td>
                    <td className="py-2 text-right font-medium text-green-600">{formatCurrency(alloc.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
