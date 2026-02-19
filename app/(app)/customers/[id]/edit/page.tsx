import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Customer</h1>
        <p className="text-gray-500">{customer.name}</p>
      </div>
      <CustomerForm initialData={customer} />
    </div>
  );
}
