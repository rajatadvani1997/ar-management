import Link from "next/link";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { formatCurrency, formatDate, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { InvoiceStatus } from "@/app/generated/prisma/client";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const { status = "", search = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, Number(page));
  const pageSize = 20;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>
        <Link href="/invoices/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Invoice</Button>
        </Link>
      </div>

      {/* Filters render instantly — no data dependency */}
      <form className="flex flex-wrap gap-3">
        <input name="search" defaultValue={search} placeholder="Search invoices..." className="h-9 rounded-md border border-gray-300 px-3 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="status" defaultValue={status} className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PAID">Paid</option>
          <option value="WRITTEN_OFF">Written Off</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        <Link href="/invoices"><Button variant="ghost" size="sm">Clear</Button></Link>
      </form>

      {/* Table streams in via Suspense — CLS prevented by fixed skeleton height */}
      <Suspense fallback={<TableSkeleton rows={pageSize} cols={7} />}>
        <InvoicesTable status={status} search={search} page={currentPage} pageSize={pageSize} />
      </Suspense>
    </div>
  );
}

async function InvoicesTable({
  status,
  search,
  page,
  pageSize,
}: {
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  const skip = (page - 1) * pageSize;
  const where = {
    ...(status && { status: status as InvoiceStatus }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ],
    }),
  };

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true, customerCode: true } } },
      orderBy: { invoiceDate: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const searchQs = new URLSearchParams({ ...(search && { search }), ...(status && { status }) });

  return (
    <>
      <p className="text-sm text-gray-500">{total} invoice{total !== 1 ? "s" : ""}</p>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
            ) : invoices.map((inv) => {
              const sc = INVOICE_STATUS_CONFIG[inv.status];
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${inv.customerId}`} className="hover:underline">{inv.customer.name}</Link>
                    <div className="text-xs text-gray-400">{inv.customer.customerCode}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.balanceAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sc.className}`}>{sc.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/invoices?${searchQs}&page=${page - 1}`}><Button variant="outline" size="sm">← Prev</Button></Link>
            ) : (
              <Button variant="outline" size="sm" disabled>← Prev</Button>
            )}
            {page < totalPages ? (
              <Link href={`/invoices?${searchQs}&page=${page + 1}`}><Button variant="outline" size="sm">Next →</Button></Link>
            ) : (
              <Button variant="outline" size="sm" disabled>Next →</Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
