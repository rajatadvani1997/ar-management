import prisma from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, RISK_FLAG_CONFIG, PROMISE_STATUS_CONFIG } from "@/lib/utils";
import { CallLogDialog } from "@/components/call-logs/call-log-dialog";
import Link from "next/link";
import { Phone, AlertTriangle, Clock, XCircle, PhoneCall } from "lucide-react";

export default async function CallingPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    overdueCustomers,
    dueTodayInvoices,
    promisesToday,
    brokenPromises,
    // Call Today data sources
    callTodayDueInvs,
    callTodayPromises,
    callTodayExpiredPromiseCustomers,
    callTodayNoPromiseCustomers,
  ] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true, overdueAmt: { gt: 0 } },
      orderBy: { overdueAmt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { gte: today, lt: tomorrow },
      },
      include: { customer: { select: { id: true, name: true, customerCode: true, phone: true, contactPerson: true } } },
      orderBy: { balanceAmount: "desc" },
    }),
    prisma.promiseDate.findMany({
      where: { status: "PENDING", promisedDate: { gte: today, lt: tomorrow } },
      include: { customer: { select: { id: true, name: true, customerCode: true, phone: true, contactPerson: true } } },
      orderBy: { promisedAmount: "desc" },
    }),
    prisma.promiseDate.findMany({
      where: { status: "BROKEN" },
      include: { customer: { select: { id: true, name: true, customerCode: true, phone: true, riskFlag: true } } },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    }),
    // 1. Invoices due today (UNPAID/PARTIAL)
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { gte: today, lt: tomorrow } },
      _sum: { balanceAmount: true },
    }),
    // 2. Pending promises due today
    prisma.promiseDate.groupBy({
      by: ["customerId"],
      where: { status: "PENDING", promisedDate: { gte: today, lt: tomorrow } },
      _sum: { promisedAmount: true },
    }),
    // 3. Overdue + pending promise that has passed its date (not yet marked broken)
    prisma.customer.findMany({
      where: {
        isActive: true,
        overdueAmt: { gt: 0 },
        promises: { some: { status: "PENDING", promisedDate: { lt: today } } },
      },
      select: { id: true },
    }),
    // 4. Overdue + no pending promise at all
    prisma.customer.findMany({
      where: {
        isActive: true,
        overdueAmt: { gt: 0 },
        promises: { none: { status: "PENDING" } },
      },
      select: { id: true },
    }),
  ]);

  // Collect all unique customer IDs for the Call Today list
  const callTodayIds = new Set([
    ...callTodayDueInvs.map((r) => r.customerId),
    ...callTodayPromises.map((r) => r.customerId),
    ...callTodayExpiredPromiseCustomers.map((c) => c.id),
    ...callTodayNoPromiseCustomers.map((c) => c.id),
  ]);

  // Fetch full customer records for those IDs
  const callTodayCustomers = await prisma.customer.findMany({
    where: { id: { in: [...callTodayIds] } },
    select: {
      id: true, name: true, customerCode: true, phone: true,
      contactPerson: true, riskFlag: true, overdueAmt: true, outstandingAmt: true,
    },
    orderBy: { overdueAmt: "desc" },
  });

  // Build lookup maps for per-customer reason metadata
  const dueTodayMap = new Map(callTodayDueInvs.map((r) => [r.customerId, r._sum.balanceAmount ?? 0]));
  const promiseTodayMap = new Map(callTodayPromises.map((r) => [r.customerId, r._sum.promisedAmount ?? 0]));
  const expiredPromiseSet = new Set(callTodayExpiredPromiseCustomers.map((c) => c.id));
  const noPromiseSet = new Set(callTodayNoPromiseCustomers.map((c) => c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Calling List</h1>
        <p className="text-gray-500">Today: {formatDate(new Date())}</p>
      </div>

      <Tabs defaultValue="call-today">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="call-today" className="flex items-center gap-1">
            <PhoneCall className="h-3 w-3" />
            Call Today
            <span className="ml-1 rounded-full bg-green-600 text-white text-xs px-1.5">{callTodayCustomers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
            <span className="ml-1 rounded-full bg-red-500 text-white text-xs px-1.5">{overdueCustomers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="due-today" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due Today
            <span className="ml-1 rounded-full bg-orange-500 text-white text-xs px-1.5">{dueTodayInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="promises-today" className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Promises Today
            <span className="ml-1 rounded-full bg-blue-500 text-white text-xs px-1.5">{promisesToday.length}</span>
          </TabsTrigger>
          <TabsTrigger value="broken" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Broken
            <span className="ml-1 rounded-full bg-purple-500 text-white text-xs px-1.5">{brokenPromises.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* Each tab delegates to a single-responsibility component — SRP */}
        <TabsContent value="call-today" className="mt-4">
          <CallTodayList
            customers={callTodayCustomers}
            dueTodayMap={dueTodayMap}
            promiseTodayMap={promiseTodayMap}
            expiredPromiseSet={expiredPromiseSet}
            noPromiseSet={noPromiseSet}
          />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <OverdueCustomerList customers={overdueCustomers} />
        </TabsContent>
        <TabsContent value="due-today" className="mt-4">
          <DueTodayInvoiceList invoices={dueTodayInvoices} />
        </TabsContent>
        <TabsContent value="promises-today" className="mt-4">
          <PromisesTodayList promises={promisesToday} />
        </TabsContent>
        <TabsContent value="broken" className="mt-4">
          <BrokenPromisesList promises={brokenPromises} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tab sub-components (SRP: each renders one UI concern) ─────────────────────

type CallTodayCustomer = {
  id: string; name: string; customerCode: string; phone: string;
  contactPerson: string | null; riskFlag: string; overdueAmt: number; outstandingAmt: number;
};

function CallTodayList({
  customers,
  dueTodayMap,
  promiseTodayMap,
  expiredPromiseSet,
  noPromiseSet,
}: {
  customers: CallTodayCustomer[];
  dueTodayMap: Map<string, number>;
  promiseTodayMap: Map<string, number>;
  expiredPromiseSet: Set<string>;
  noPromiseSet: Set<string>;
}) {
  if (customers.length === 0)
    return <p className="text-center text-gray-400 py-10">No customers to call today. Great!</p>;
  return (
    <div className="space-y-3">
      {customers.map((c) => {
        const rc = RISK_FLAG_CONFIG[c.riskFlag as keyof typeof RISK_FLAG_CONFIG];
        const dueToday = dueTodayMap.get(c.id);
        const promiseToday = promiseTodayMap.get(c.id);
        return (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/customers/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${rc.className}`}>{rc.label}</span>
                    <span className="text-xs text-gray-400">{c.customerCode}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    {c.contactPerson && <span>{c.contactPerson}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dueToday !== undefined && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                        Due today: {formatCurrency(dueToday)}
                      </span>
                    )}
                    {promiseToday !== undefined && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        Promise today{promiseToday > 0 ? `: ${formatCurrency(promiseToday)}` : ""}
                      </span>
                    )}
                    {expiredPromiseSet.has(c.id) && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                        Promise date passed
                      </span>
                    )}
                    {noPromiseSet.has(c.id) && (
                      <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        Overdue – no promise
                      </span>
                    )}
                  </div>
                  {c.overdueAmt > 0 && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">Overdue: {formatCurrency(c.overdueAmt)}</span>
                      <span className="text-gray-400 ml-3">Outstanding: {formatCurrency(c.outstandingAmt)}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <CallLogDialog customerId={c.id} customerName={c.name} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type OverdueCustomer = {
  id: string; name: string; customerCode: string; phone: string;
  contactPerson: string | null; riskFlag: string; overdueAmt: number; outstandingAmt: number;
};

function OverdueCustomerList({ customers }: { customers: OverdueCustomer[] }) {
  if (customers.length === 0)
    return <p className="text-center text-gray-400 py-10">No overdue customers. Great!</p>;
  return (
    <div className="space-y-3">
      {customers.map((c) => {
        const rc = RISK_FLAG_CONFIG[c.riskFlag as keyof typeof RISK_FLAG_CONFIG];
        return (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${rc.className}`}>{rc.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    {c.contactPerson && <span>{c.contactPerson}</span>}
                  </div>
                  <div className="text-sm">
                    <span className="text-red-600 font-medium">Overdue: {formatCurrency(c.overdueAmt)}</span>
                    <span className="text-gray-400 ml-2">Total: {formatCurrency(c.outstandingAmt)}</span>
                  </div>
                </div>
                <CallLogDialog customerId={c.id} customerName={c.name} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type DueTodayInvoice = {
  id: string; invoiceNumber: string; balanceAmount: number;
  customer: { id: string; name: string; customerCode: string; phone: string; contactPerson: string | null };
};

function DueTodayInvoiceList({ invoices }: { invoices: DueTodayInvoice[] }) {
  if (invoices.length === 0)
    return <p className="text-center text-gray-400 py-10">No invoices due today</p>;
  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link href={`/customers/${inv.customer.id}`} className="font-semibold hover:underline">{inv.customer.name}</Link>
                  <span className="text-xs text-gray-400">{inv.customer.customerCode}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone className="h-3 w-3" />{inv.customer.phone}
                </div>
                <div className="text-sm">
                  <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">{inv.invoiceNumber}</Link>
                  <span className="text-gray-400 ml-2">Balance: {formatCurrency(inv.balanceAmount)}</span>
                </div>
              </div>
              <CallLogDialog customerId={inv.customer.id} customerName={inv.customer.name} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type PromiseToday = {
  id: string; promisedAmount: number | null; notes: string | null;
  customer: { id: string; name: string; phone: string };
};

function PromisesTodayList({ promises }: { promises: PromiseToday[] }) {
  if (promises.length === 0)
    return <p className="text-center text-gray-400 py-10">No promises due today</p>;
  return (
    <div className="space-y-3">
      {promises.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Link href={`/customers/${p.customer.id}`} className="font-semibold hover:underline">{p.customer.name}</Link>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Phone className="h-3 w-3" />{p.customer.phone}
                </div>
                <div className="text-sm">
                  <span className="text-blue-600 font-medium">Promised: {p.promisedAmount != null ? formatCurrency(p.promisedAmount) : "—"}</span>
                  {p.notes && <span className="text-gray-400 ml-2">{p.notes}</span>}
                </div>
              </div>
              <CallLogDialog customerId={p.customer.id} customerName={p.customer.name} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type BrokenPromise = {
  id: string; promisedAmount: number | null; promisedDate: Date;
  customer: { id: string; name: string; phone: string; riskFlag: string };
};

function BrokenPromisesList({ promises }: { promises: BrokenPromise[] }) {
  if (promises.length === 0)
    return <p className="text-center text-gray-400 py-10">No broken promises</p>;
  return (
    <div className="space-y-3">
      {promises.map((p) => {
        const rc = RISK_FLAG_CONFIG[p.customer.riskFlag as keyof typeof RISK_FLAG_CONFIG];
        return (
          <Card key={p.id} className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${p.customer.id}`} className="font-semibold hover:underline">{p.customer.name}</Link>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${rc.className}`}>{rc.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone className="h-3 w-3" />{p.customer.phone}
                  </div>
                  <div className="text-sm text-red-600">
                    Broken promise: {p.promisedAmount != null ? formatCurrency(p.promisedAmount) : "—"} — was due {formatDate(p.promisedDate)}
                  </div>
                </div>
                <CallLogDialog customerId={p.customer.id} customerName={p.customer.name} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
