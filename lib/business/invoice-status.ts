import prisma from "@/lib/prisma";
import { InvoiceStatus } from "@/app/generated/prisma/client";

export function computeInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date,
  currentStatus: InvoiceStatus
): InvoiceStatus {
  // Terminal status — never auto-changed
  if (currentStatus === "WRITTEN_OFF") return "WRITTEN_OFF";

  const now = new Date();
  const isOverdue = dueDate < now;
  const balance = totalAmount - paidAmount;

  if (balance <= 0.01) return "PAID";
  if (paidAmount > 0 && isOverdue) return "OVERDUE";
  if (paidAmount > 0 && !isOverdue) return "PARTIAL";
  if (paidAmount === 0 && isOverdue) return "OVERDUE";
  return "UNPAID";
}

export async function refreshInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const newStatus = computeInvoiceStatus(
    invoice.totalAmount,
    invoice.paidAmount,
    invoice.dueDate,
    invoice.status
  );
  if (newStatus !== invoice.status) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });
  }
  return newStatus;
}

/** Refresh all non-terminal invoices — used by cron */
export async function refreshAllInvoiceStatuses() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { notIn: ["PAID", "WRITTEN_OFF"] } },
  });

  let updated = 0;
  for (const inv of invoices) {
    const newStatus = computeInvoiceStatus(
      inv.totalAmount,
      inv.paidAmount,
      inv.dueDate,
      inv.status
    );
    if (newStatus !== inv.status) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: newStatus } });
      updated++;
    }
  }
  return updated;
}
