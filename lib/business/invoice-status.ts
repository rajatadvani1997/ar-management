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

/** Refresh all non-terminal invoices — used by cron.
 *
 * Batches updates by grouping invoices by their new status, then issues
 * one `updateMany` per distinct new status (max 3 calls instead of N).
 * SRP: computeInvoiceStatus() is unchanged — only the persistence loop changed.
 */
export async function refreshAllInvoiceStatuses() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { notIn: ["PAID", "WRITTEN_OFF"] } },
    select: { id: true, totalAmount: true, paidAmount: true, dueDate: true, status: true },
  });

  // Group IDs by their new target status
  const statusGroups = new Map<InvoiceStatus, string[]>();
  for (const inv of invoices) {
    const newStatus = computeInvoiceStatus(
      inv.totalAmount,
      inv.paidAmount,
      inv.dueDate,
      inv.status
    );
    if (newStatus !== inv.status) {
      const ids = statusGroups.get(newStatus) ?? [];
      ids.push(inv.id);
      statusGroups.set(newStatus, ids);
    }
  }

  if (statusGroups.size === 0) return 0;

  // One updateMany per distinct new status (max 3 DB calls instead of N)
  await Promise.all(
    Array.from(statusGroups.entries()).map(([status, ids]) =>
      prisma.invoice.updateMany({ where: { id: { in: ids } }, data: { status } })
    )
  );

  return Array.from(statusGroups.values()).reduce((sum, ids) => sum + ids.length, 0);
}
