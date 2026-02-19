import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AllocationTable } from "@/components/payments/allocation-table";

export default async function AllocatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { customer: true, allocations: true },
  });
  if (!payment) notFound();

  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: payment.customerId,
      status: { notIn: ["PAID", "WRITTEN_OFF"] },
    },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Allocate Payment</h1>
        <p className="text-gray-500">
          {payment.paymentNumber} · {payment.customer.name} · Unallocated: ₹{payment.unallocatedAmount.toLocaleString()}
        </p>
      </div>
      <AllocationTable
        payment={payment}
        invoices={invoices.map(i => ({
          ...i,
          dueDate: i.dueDate.toISOString(),
          invoiceDate: i.invoiceDate.toISOString(),
        }))}
        existingAllocations={payment.allocations}
      />
    </div>
  );
}
