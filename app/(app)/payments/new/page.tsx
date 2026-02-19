import prisma from "@/lib/prisma";
import { PaymentWithAllocationForm } from "@/components/payments/payment-with-allocation-form";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId: defaultCustomerId } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, customerCode: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Record Payment</h1>
        <p className="text-gray-500">Enter payment details and optionally allocate to invoices</p>
      </div>
      <PaymentWithAllocationForm customers={customers} defaultCustomerId={defaultCustomerId} />
    </div>
  );
}
