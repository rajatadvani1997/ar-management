/**
 * Allocation Strategy — Interface (OCP + DIP + LSP)
 *
 * OCP  — new strategies (e.g. ProportionalStrategy) are added without
 *         modifying the payment service. The service is closed for
 *         modification but open to extension.
 * DIP  — PaymentService depends on this abstraction, not on concrete classes.
 * LSP  — any concrete strategy can substitute another; the service never
 *         inspects which one it received.
 * ISP  — callers only see `allocate()`. Strategies expose no extra surface.
 */

export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  balanceAmount: number;
  dueDate: Date;
}

export interface AllocationItem {
  invoiceId: string;
  amount: number;
}

/** Every strategy must honour this contract. */
export interface AllocationStrategy {
  readonly name: string;
  /**
   * Given a payment amount and a list of unpaid invoices,
   * returns the allocation plan to apply.
   *
   * Pure function — does NOT touch the database.
   */
  allocate(paymentAmount: number, invoices: UnpaidInvoice[]): AllocationItem[];
}
