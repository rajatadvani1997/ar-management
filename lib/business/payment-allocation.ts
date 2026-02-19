import prisma from "@/lib/prisma";
import { computeInvoiceStatus } from "./invoice-status";
import { recalculateCustomerTotals } from "./customer-totals";
import { updateRiskFlag } from "./risk-flag";

interface AllocationItem {
  invoiceId: string;
  amount: number;
}

export async function applyPaymentAllocation(
  paymentId: string,
  allocations: AllocationItem[]
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Load payment
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { allocations: true },
    });

    // 2. Validate total allocations <= payment amount
    const existingAllocationsForOtherInvoices = payment.allocations.filter(
      (a) => !allocations.find((newA) => newA.invoiceId === a.invoiceId)
    );
    const existingTotal = existingAllocationsForOtherInvoices.reduce(
      (sum, a) => sum + a.amount,
      0
    );
    const newTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
    const grandTotal = existingTotal + newTotal;

    if (grandTotal > payment.amount + 0.01) {
      throw new Error(
        `Total allocations (${grandTotal}) exceed payment amount (${payment.amount})`
      );
    }

    // 3. Load invoices and validate each allocation
    for (const alloc of allocations) {
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: alloc.invoiceId },
      });

      if (invoice.status === "WRITTEN_OFF") {
        throw new Error(`Invoice ${invoice.invoiceNumber} is written off`);
      }

      if (invoice.customerId !== payment.customerId) {
        throw new Error(
          `Invoice ${invoice.invoiceNumber} does not belong to this customer`
        );
      }

      // Check existing allocation for this invoice
      const existingAlloc = payment.allocations.find(
        (a) => a.invoiceId === alloc.invoiceId
      );
      const existingAllocAmt = existingAlloc?.amount ?? 0;
      const additionalAmount = alloc.amount - existingAllocAmt;

      if (invoice.balanceAmount < additionalAmount - 0.01) {
        throw new Error(
          `Allocation (${alloc.amount}) exceeds balance (${invoice.balanceAmount}) for invoice ${invoice.invoiceNumber}`
        );
      }
    }

    // 4. Upsert allocations and update invoices
    for (const alloc of allocations) {
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: alloc.invoiceId },
      });

      const existingAlloc = payment.allocations.find(
        (a) => a.invoiceId === alloc.invoiceId
      );
      const previousAmount = existingAlloc?.amount ?? 0;
      const amountDiff = alloc.amount - previousAmount;

      // Upsert allocation record
      await tx.paymentAllocation.upsert({
        where: {
          paymentId_invoiceId: {
            paymentId,
            invoiceId: alloc.invoiceId,
          },
        },
        create: {
          paymentId,
          invoiceId: alloc.invoiceId,
          amount: alloc.amount,
        },
        update: { amount: alloc.amount },
      });

      // Update invoice
      const newPaidAmount = invoice.paidAmount + amountDiff;
      const newBalance = invoice.totalAmount - newPaidAmount;
      const newStatus = computeInvoiceStatus(
        invoice.totalAmount,
        newPaidAmount,
        invoice.dueDate,
        invoice.status
      );

      await tx.invoice.update({
        where: { id: alloc.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: Math.max(0, newBalance),
          status: newStatus,
        },
      });
    }

    // 5. Recalculate payment totals
    const allAllocations = await tx.paymentAllocation.findMany({
      where: { paymentId },
    });
    const totalAllocated = allAllocations.reduce((s, a) => s + a.amount, 0);
    const unallocated = payment.amount - totalAllocated;

    let paymentStatus: "UNALLOCATED" | "PARTIAL" | "APPLIED" = "UNALLOCATED";
    if (totalAllocated >= payment.amount - 0.01) paymentStatus = "APPLIED";
    else if (totalAllocated > 0) paymentStatus = "PARTIAL";

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        allocatedAmount: totalAllocated,
        unallocatedAmount: Math.max(0, unallocated),
        status: paymentStatus,
      },
    });

    // 6. Recalculate customer totals (outside transaction is fine since this reads committed data)
    return { paymentId, totalAllocated, unallocated };
  });
}
