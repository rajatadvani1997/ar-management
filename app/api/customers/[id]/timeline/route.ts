import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const [invoices, payments, callLogs, promises] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: id },
      select: { id: true, invoiceNumber: true, totalAmount: true, invoiceDate: true, status: true },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { customerId: id },
      select: { id: true, paymentNumber: true, amount: true, paymentDate: true, paymentMode: true },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.callLog.findMany({
      where: { customerId: id },
      include: { calledBy: { select: { name: true } } },
      orderBy: { callDate: "desc" },
    }),
    prisma.promiseDate.findMany({
      where: { customerId: id },
      orderBy: { promisedDate: "desc" },
    }),
  ]);

  // Merge into timeline
  const timeline = [
    ...invoices.map((i) => ({ type: "invoice", date: i.invoiceDate, data: i })),
    ...payments.map((p) => ({ type: "payment", date: p.paymentDate, data: p })),
    ...callLogs.map((c) => ({ type: "call", date: c.callDate, data: c })),
    ...promises.map((p) => ({ type: "promise", date: p.createdAt, data: p })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ timeline });
}
