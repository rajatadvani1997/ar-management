/**
 * Manual Allocation Strategy
 *
 * Passes through the explicit allocations provided by the user.
 * Validates totals and per-invoice balances, but does not reorder.
 *
 * LSP guarantee: the service treats this identically to FifoStrategy.
 */

import type { AllocationStrategy, AllocationItem, UnpaidInvoice } from "./allocation-strategy";

export class ManualAllocationStrategy implements AllocationStrategy {
  readonly name = "MANUAL";

  constructor(private readonly requestedAllocations: AllocationItem[]) {}

  allocate(paymentAmount: number, invoices: UnpaidInvoice[]): AllocationItem[] {
    const balanceMap = new Map(invoices.map((i) => [i.id, i.balanceAmount]));
    const result: AllocationItem[] = [];
    let total = 0;

    for (const req of this.requestedAllocations) {
      const available = balanceMap.get(req.invoiceId);
      if (available === undefined) {
        throw new Error(`Invoice ${req.invoiceId} not found or already paid`);
      }
      if (req.amount > available + 0.01) {
        throw new Error(
          `Allocation ${req.amount} exceeds balance ${available} for invoice ${req.invoiceId}`
        );
      }
      result.push(req);
      total += req.amount;
    }

    if (total > paymentAmount + 0.01) {
      throw new Error(`Total allocations (${total}) exceed payment amount (${paymentAmount})`);
    }

    return result;
  }
}
