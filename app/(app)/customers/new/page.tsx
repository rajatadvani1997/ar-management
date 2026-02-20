import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function NewCustomerPage() {
  const [session, users] = await Promise.all([
    getSession(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Customer</h1>
        <p className="text-gray-500">Add a new customer to the system</p>
      </div>
      <CustomerForm users={users} defaultOwnerId={session?.user?.id} />
    </div>
  );
}
