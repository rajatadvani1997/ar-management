import prisma from "@/lib/prisma";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const [customers, settings] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, customerCode: true, creditLimit: true, outstandingAmt: true, defaultPaymentTermDays: true },
      orderBy: { name: "asc" },
    }),
    prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } }),
  ]);

  const preselectedCustomer = customerId ? customers.find((c) => c.id === customerId) : null;
  const defaultPaymentTerms = preselectedCustomer?.defaultPaymentTermDays ?? settings?.defaultPaymentTerms ?? 30;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <p className="text-gray-500">Create a new invoice for a customer</p>
      </div>
      <InvoiceForm
        customers={customers}
        defaultCustomerId={customerId}
        defaultPaymentTerms={defaultPaymentTerms}
      />
    </div>
  );
}
