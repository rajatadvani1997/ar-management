import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, RISK_FLAG_CONFIG, INVOICE_STATUS_CONFIG, CALL_STATUS_CONFIG, PROMISE_STATUS_CONFIG, PAYMENT_MODE_LABELS } from "@/lib/utils";
import { Pencil, Phone, Mail, MapPin, AlertTriangle, Plus } from "lucide-react";
import { CallLogDialog } from "@/components/call-logs/call-log-dialog";
import { CallLogEditDialog } from "@/components/call-logs/call-log-edit-dialog";
import { CallLogDeleteButton } from "@/components/call-logs/call-log-delete-button";
import { PromiseDialog } from "@/components/promises/promise-dialog";
import { PromiseDeleteButton } from "@/components/promises/promise-delete-button";
import { DeleteCustomerButton } from "./delete-button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [invoices, payments, callLogs, promises] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: id },
      include: { lineItems: true, allocations: { include: { payment: true } } },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { customerId: id },
      include: { allocations: { include: { invoice: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.callLog.findMany({
      where: { customerId: id },
      include: { calledBy: { select: { name: true } }, promise: true },
      orderBy: { callDate: "desc" },
    }),
    prisma.promiseDate.findMany({
      where: { customerId: id },
      orderBy: { promisedDate: "desc" },
    }),
  ]);

  const riskConfig = RISK_FLAG_CONFIG[customer.riskFlag];
  const utilizationPct = customer.creditLimit > 0
    ? Math.round((customer.outstandingAmt / customer.creditLimit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskConfig.className}`}>
              {riskConfig.label}
            </span>
          </div>
          <p className="text-gray-500">{customer.customerCode}</p>
        </div>
        <div className="flex gap-2">
          <CallLogDialog customerId={id} customerName={customer.name} />
          <Link href={`/customers/${id}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Edit</Button>
          </Link>
          {role === "ADMIN" && (
            <DeleteCustomerButton
              customerId={id}
              hasOutstanding={customer.outstandingAmt > 0}
            />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(customer.outstandingAmt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className={`text-lg font-bold ${customer.overdueAmt > 0 ? "text-red-600" : "text-gray-400"}`}>
              {formatCurrency(customer.overdueAmt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Credit Limit</p>
            <p className="text-lg font-bold">{formatCurrency(customer.creditLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Credit Used</p>
            <p className={`text-lg font-bold ${utilizationPct >= 80 ? "text-red-600" : "text-gray-900"}`}>
              {utilizationPct}%
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full ${utilizationPct >= 100 ? "bg-red-500" : utilizationPct >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${Math.min(utilizationPct, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            {customer.contactPerson && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Contact:</span> {customer.contactPerson}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />{customer.phone}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />{customer.email}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />{customer.address}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="calls">Call Logs ({callLogs.length})</TabsTrigger>
          <TabsTrigger value="promises">Promises ({promises.length})</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <div className="flex justify-end mb-3">
            <Link href={`/invoices/new?customerId=${id}`}>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Invoice</Button>
            </Link>
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No invoices</td></tr>
                ) : invoices.map((inv) => {
                  const sc = INVOICE_STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                          {inv.invoiceNumber}
                        </Link>
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
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <div className="flex justify-end mb-3">
            <Link href={`/payments/new?customerId=${id}`}>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Record Payment</Button>
            </Link>
          </div>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mode</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Unallocated</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No payments</td></tr>
                ) : payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/payments/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.paymentNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 text-gray-500">{PAYMENT_MODE_LABELS[p.paymentMode]}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.unallocatedAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${p.status === "APPLIED" ? "text-green-600" : p.status === "PARTIAL" ? "text-blue-600" : "text-yellow-600"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Call Logs Tab */}
        <TabsContent value="calls" className="mt-4">
          {role !== "VIEWER" && (
            <div className="flex justify-end mb-3">
              <CallLogDialog customerId={id} customerName={customer.name} />
            </div>
          )}
          <div className="space-y-3">
            {callLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No call logs</p>
            ) : callLogs.map((c) => {
              const sc = CALL_STATUS_CONFIG[c.callStatus];
              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sc.className}`}>{sc.label}</span>
                          <span className="text-xs text-gray-400">{formatDate(c.callDate)}</span>
                          <span className="text-xs text-gray-400">by {c.calledBy.name}</span>
                        </div>
                        {c.notes && <p className="text-sm text-gray-700">{c.notes}</p>}
                        {c.nextCallDate && (
                          <p className="text-xs text-gray-500">Next call: {formatDate(c.nextCallDate)}</p>
                        )}
                        {c.promise && (
                          <p className="text-xs text-blue-600">
                            Promise: {c.promise.promisedAmount != null ? formatCurrency(c.promise.promisedAmount) : "—"} by {formatDate(c.promise.promisedDate)} —{" "}
                            <span className={PROMISE_STATUS_CONFIG[c.promise.status].className}>{c.promise.status}</span>
                          </p>
                        )}
                      </div>
                      {role !== "VIEWER" && (
                        <div className="flex items-center gap-1 shrink-0">
                          <CallLogEditDialog callLog={{
                            id: c.id,
                            callStatus: c.callStatus,
                            callDate: c.callDate,
                            notes: c.notes,
                            nextCallDate: c.nextCallDate,
                            promise: c.promise ?? null,
                          }} />
                          <CallLogDeleteButton callLogId={c.id} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Promises Tab */}
        <TabsContent value="promises" className="mt-4">
          {role !== "VIEWER" && (
            <div className="flex justify-end mb-3">
              <PromiseDialog customerId={id} />
            </div>
          )}
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Promised Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Resolved</th>
                  {role !== "VIEWER" && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {promises.length === 0 ? (
                  <tr><td colSpan={role !== "VIEWER" ? 6 : 5} className="px-4 py-6 text-center text-gray-400">No promises recorded</td></tr>
                ) : promises.map((p) => {
                  const pc = PROMISE_STATUS_CONFIG[p.status];
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{formatDate(p.promisedDate)}</td>
                      <td className="px-4 py-3 text-right font-medium">{p.promisedAmount != null ? formatCurrency(p.promisedAmount) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pc.className}`}>{pc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.resolvedAt ? formatDate(p.resolvedAt) : "—"}</td>
                      {role !== "VIEWER" && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <PromiseDialog customerId={id} promise={p} />
                            <PromiseDeleteButton promiseId={p.id} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
