import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { formatCurrency, RISK_FLAG_CONFIG } from "@/lib/utils";
import { Plus, Phone, Mail } from "lucide-react";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; riskFlag?: string }>;
}) {
  const { search = "", riskFlag = "" } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { customerCode: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
      ...(riskFlag && { riskFlag: riskFlag as any }),
    },
    orderBy: [{ overdueAmt: "desc" }, { outstandingAmt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500">{customers.length} customers</p>
        </div>
        <Link href="/customers/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name, code, phone..."
          className="h-9 rounded-md border border-gray-300 px-3 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select name="riskFlag" defaultValue={riskFlag} className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Risk Levels</option>
          <option value="SAFE">Safe</option>
          <option value="WATCHLIST">Watchlist</option>
          <option value="HIGH_RISK">High Risk</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        <Link href="/customers"><Button variant="ghost" size="sm">Clear</Button></Link>
      </form>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Outstanding</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Overdue</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No customers found.{" "}
                  <Link href="/customers/new" className="text-blue-600 underline">Add one?</Link>
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const riskConfig = RISK_FLAG_CONFIG[c.riskFlag];
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium"> <Link href={`/customers/${c.id}`}>{c.name} </Link></div>
                      <div className="text-gray-400 text-xs">{c.customerCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </div>
                      {c.contactPerson && (
                        <div className="text-gray-400 text-xs">{c.contactPerson}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(c.outstandingAmt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={c.overdueAmt > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                        {formatCurrency(c.overdueAmt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskConfig.className}`}>
                        {riskConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/customers/${c.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
