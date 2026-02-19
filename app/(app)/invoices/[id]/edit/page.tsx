import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role === "VIEWER") redirect(`/invoices/${id}`);

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) notFound();
  if (invoice.status === "WRITTEN_OFF") redirect(`/invoices/${id}`);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Invoice</h1>
        <p className="text-gray-500">{invoice.invoiceNumber}</p>
      </div>
      <InvoiceEditForm
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          paymentTermDays: invoice.paymentTermDays,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          referenceNumber: invoice.referenceNumber,
          notes: invoice.notes,
          status: invoice.status,
        }}
      />
    </div>
  );
}
