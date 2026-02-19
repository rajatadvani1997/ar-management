import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import { updateRiskFlag } from "@/lib/business/risk-flag";
import { computeInvoiceStatus } from "@/lib/business/invoice-status";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: "WRITTEN_OFF" },
  });

  await recalculateCustomerTotals(invoice.customerId);
  await updateRiskFlag(invoice.customerId);

  return NextResponse.json({ invoice });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "WRITTEN_OFF") {
    return NextResponse.json({ error: "Invoice is not written off" }, { status: 400 });
  }

  // Recompute the correct status — pass "UNPAID" as the dummy current status
  // so computeInvoiceStatus doesn't short-circuit on WRITTEN_OFF
  const restoredStatus = computeInvoiceStatus(
    existing.totalAmount,
    existing.paidAmount,
    existing.dueDate,
    "UNPAID"
  );

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: restoredStatus },
  });

  await recalculateCustomerTotals(invoice.customerId);
  await updateRiskFlag(invoice.customerId);

  return NextResponse.json({ invoice });
}
