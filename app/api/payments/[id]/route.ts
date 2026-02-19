import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { paymentUpdateSchema } from "@/lib/validators";
import { computeInvoiceStatus } from "@/lib/business/invoice-status";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      allocations: { include: { invoice: { include: { lineItems: true } } } },
    },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ payment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = paymentUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { amount, ...rest } = parsed.data;

  // New amount cannot be less than what is already allocated to invoices
  if (amount !== undefined && amount < existing.allocatedAmount) {
    return NextResponse.json(
      { error: `Amount cannot be less than the already allocated amount of ${existing.allocatedAmount}` },
      { status: 400 }
    );
  }

  const newAmount = amount ?? existing.amount;
  const payment = await prisma.payment.update({
    where: { id },
    data: {
      ...rest,
      ...(amount !== undefined && {
        amount: newAmount,
        unallocatedAmount: newAmount - existing.allocatedAmount,
      }),
    },
  });

  return NextResponse.json({ payment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { allocations: { include: { invoice: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Revert each invoice's paid amount before deleting allocations
    for (const alloc of payment.allocations) {
      const newPaidAmount = alloc.invoice.paidAmount - alloc.amount;
      const newBalance = alloc.invoice.totalAmount - newPaidAmount;
      const newStatus = computeInvoiceStatus(
        alloc.invoice.totalAmount,
        newPaidAmount,
        alloc.invoice.dueDate,
        alloc.invoice.status
      );
      await tx.invoice.update({
        where: { id: alloc.invoiceId },
        data: { paidAmount: newPaidAmount, balanceAmount: newBalance, status: newStatus },
      });
    }

    await tx.payment.delete({ where: { id } });
  });

  await recalculateCustomerTotals(payment.customerId);
  return NextResponse.json({ success: true });
}
