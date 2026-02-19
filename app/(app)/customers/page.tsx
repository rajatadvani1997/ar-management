import Link from "next/link";
import { Suspense } from "react";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { formatCurrency, RISK_FLAG_CONFIG } from "@/lib/utils";
import { Plus, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import type { RiskFlag } from "@/app/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; riskFlag?: string; page?: string }>;
}) {
  const { search = "", riskFlag = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, Number(page));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
        </div>
        <Link href="/customers/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
        </Link>
      </div>

      {/* Filters — render instantly (no data dependency) */}
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

      {/* Table streams in — skeleton shown during DB query (CLS prevention via fixed height) */}
      <Suspense fallback={<TableSkeleton rows={PAGE_SIZE} cols={6} />}>
        <CustomerTable
          search={search}
          riskFlag={riskFlag}
          page={currentPage}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  );
}

async function CustomerTable({
  search,
  riskFlag,
  page,
  pageSize,
}: {
  search: string;
  riskFlag: string;
  page: number;
  pageSize: number;
}) {
  const result = await customerRepository.findMany({
    search: search || undefined,
    riskFlag: (riskFlag as RiskFlag) || undefined,
    isActive: true,
    page,
    pageSize,
  });

  const { data: customers, total, totalPages } = result;
  const searchQs = new URLSearchParams({ ...(search && { search }), ...(riskFlag && { riskFlag }) });

  return (
    <>
      <p className="text-sm text-gray-500">{total} customer{total !== 1 ? "s" : ""}</p>
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
                const riskConfig = RISK_FLAG_CONFIG[c.riskFlag as RiskFlag];
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium"><Link href={`/customers/${c.id}`}>{c.name}</Link></div>
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/customers?${searchQs}&page=${page - 1}`}>
                <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" />Prev</Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled><ChevronLeft className="h-4 w-4" />Prev</Button>
            )}
            {page < totalPages ? (
              <Link href={`/customers?${searchQs}&page=${page + 1}`}>
                <Button variant="outline" size="sm">Next<ChevronRight className="h-4 w-4" /></Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>Next<ChevronRight className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
