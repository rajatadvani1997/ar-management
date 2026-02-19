/**
 * FIFO Allocation Strategy
 *
 * Allocates payment to the oldest (earliest due-date) invoices first.
 * Used when a collector clicks "Auto-Allocate".
 *
 * Pure function — no side effects, easy to unit test.
 */

import type { AllocationStrategy, AllocationItem, UnpaidInvoice } from "./allocation-strategy";

export class FifoAllocationStrategy implements AllocationStrategy {
  readonly name = "FIFO";

  allocate(paymentAmount: number, invoices: UnpaidInvoice[]): AllocationItem[] {
    // Invoices must already be sorted by dueDate asc (repository guarantees this)
    let remaining = paymentAmount;
    const result: AllocationItem[] = [];

    for (const inv of invoices) {
      if (remaining <= 0.005) break; // floating-point guard

      const apply = Math.min(remaining, inv.balanceAmount);
      if (apply > 0.005) {
        result.push({ invoiceId: inv.id, amount: Math.round(apply * 100) / 100 });
        remaining -= apply;
      }
    }

    return result;
  }
}

export const fifoStrategy = new FifoAllocationStrategy();
