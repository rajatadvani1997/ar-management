import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { invoiceUpdateSchema } from "@/lib/validators";
import { computeInvoiceStatus } from "@/lib/business/invoice-status";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lineItems: true,
      customer: true,
      allocations: { include: { payment: true } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = invoiceUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "WRITTEN_OFF") {
    return NextResponse.json({ error: "Cannot edit a written-off invoice" }, { status: 400 });
  }

  const { totalAmount, ...rest } = parsed.data;

  // If amount is being changed, validate it doesn't go below what's already paid
  if (totalAmount !== undefined && totalAmount < existing.paidAmount) {
    return NextResponse.json(
      { error: `Total amount cannot be less than the already paid amount of ${existing.paidAmount}` },
      { status: 400 }
    );
  }

  const newTotal = totalAmount ?? existing.totalAmount;
  const newBalance = newTotal - existing.paidAmount;
  const newStatus = computeInvoiceStatus(
    newTotal,
    existing.paidAmount,
    rest.dueDate ?? existing.dueDate,
    existing.status
  );

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...rest,
      ...(totalAmount !== undefined && {
        totalAmount: newTotal,
        subtotal: newTotal,
        balanceAmount: newBalance,
      }),
      status: newStatus,
    },
  });

  // Update the single auto-generated line item if amount changed
  if (totalAmount !== undefined) {
    await prisma.invoiceLineItem.updateMany({
      where: { invoiceId: id },
      data: { unitPrice: newTotal, lineTotal: newTotal },
    });
  }

  await recalculateCustomerTotals(existing.customerId);

  return NextResponse.json({ invoice });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { allocations: { include: { payment: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Revert each payment's allocated/unallocated amounts before deleting
    for (const alloc of invoice.allocations) {
      const newAllocated = alloc.payment.allocatedAmount - alloc.amount;
      const newUnallocated = alloc.payment.unallocatedAmount + alloc.amount;
      const newStatus =
        newAllocated <= 0 ? "UNALLOCATED" : newUnallocated > 0.01 ? "PARTIAL" : "APPLIED";
      await tx.payment.update({
        where: { id: alloc.paymentId },
        data: { allocatedAmount: newAllocated, unallocatedAmount: newUnallocated, status: newStatus },
      });
    }

    await tx.invoice.delete({ where: { id } });
  });

  await recalculateCustomerTotals(invoice.customerId);
  return NextResponse.json({ success: true });
}
