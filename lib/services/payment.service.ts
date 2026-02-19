/**
 * Payment Service — Use-Case / Orchestration Layer
 *
 * SOLID + Patterns:
 *  SRP     — orchestrates payment use-cases; strategy does allocation math.
 *  OCP     — swap allocation strategy without changing this service.
 *  DIP     — depends on repository abstractions and AllocationStrategy interface.
 *  Strategy Pattern — FifoStrategy or ManualStrategy injected at call site.
 */

import { paymentRepository, type PaymentFilters } from "@/lib/repositories/payment.repository";
import { invoiceRepository } from "@/lib/repositories/invoice.repository";
import { generatePaymentNumber } from "@/lib/business/sequence-generator";
import { computeInvoiceStatus } from "@/lib/business/invoice-status";
import { eventBus, registerDomainHandlers } from "@/lib/events/domain-events";
import type { AllocationStrategy } from "@/lib/strategies/allocation/allocation-strategy";
import prisma from "@/lib/prisma";

registerDomainHandlers();

export interface CreatePaymentInput {
  customerId: string;
  paymentDate: Date;
  amount: number;
  paymentMode: "CASH" | "CHEQUE" | "NEFT" | "RTGS" | "IMPS" | "UPI" | "OTHER";
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
}

const paymentService = {
  async list(filters: PaymentFilters) {
    return paymentRepository.findMany(filters);
  },

  async getById(id: string) {
    return paymentRepository.findById(id);
  },

  async listUnallocated() {
    return paymentRepository.findUnallocated();
  },

  async create(input: CreatePaymentInput) {
    const paymentNumber = await generatePaymentNumber();

    return paymentRepository.create({
      ...input,
      paymentNumber,
      allocatedAmount: 0,
      unallocatedAmount: input.amount,
      status: "UNALLOCATED",
    });
  },

  /**
   * Allocate payment using the supplied strategy.
   *
   * Strategy Pattern in action:
   *   caller passes `fifoStrategy` or `new ManualAllocationStrategy(items)`
   *   this method is identical for both — it only calls strategy.allocate().
   */
  async allocate(paymentId: string, strategy: AllocationStrategy) {
    return await prisma.$transaction(async (tx) => {
      // 1. Load payment (with existing allocations)
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { allocations: true },
      });

      // 2. Load unpaid invoices for this customer (ordered by dueDate asc for FIFO)
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          customerId: payment.customerId,
          status: { notIn: ["PAID", "WRITTEN_OFF"] },
        },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          invoiceNumber: true,
          balanceAmount: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      });

      // 3. Strategy computes the allocation plan (pure function, no DB access)
      const remainingAmount =
        payment.amount -
        payment.allocations
          .filter((a) => !unpaidInvoices.find((i) => i.id === a.invoiceId))
          .reduce((s, a) => s + a.amount, 0);

      const plan = strategy.allocate(remainingAmount, unpaidInvoices);

      if (plan.length === 0) return { paymentId, totalAllocated: 0, unallocated: payment.amount };

      // 4. Apply the plan atomically
      for (const item of plan) {
        const invoice = unpaidInvoices.find((i) => i.id === item.invoiceId)!;
        const existingAlloc = payment.allocations.find((a) => a.invoiceId === item.invoiceId);
        const prevAmount = existingAlloc?.amount ?? 0;
        const diff = item.amount - prevAmount;

        await tx.paymentAllocation.upsert({
          where: { paymentId_invoiceId: { paymentId, invoiceId: item.invoiceId } },
          create: { paymentId, invoiceId: item.invoiceId, amount: item.amount },
          update: { amount: item.amount },
        });

        const newPaid = invoice.paidAmount + diff;
        const newBalance = Math.max(0, invoice.totalAmount - newPaid);
        const newStatus = computeInvoiceStatus(
          invoice.totalAmount,
          newPaid,
          invoice.dueDate,
          invoice.status as any
        );

        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: { paidAmount: newPaid, balanceAmount: newBalance, status: newStatus },
        });
      }

      // 5. Update payment totals
      const allAllocs = await tx.paymentAllocation.findMany({ where: { paymentId } });
      const totalAllocated = allAllocs.reduce((s, a) => s + a.amount, 0);
      const unallocated = Math.max(0, payment.amount - totalAllocated);
      const paymentStatus =
        totalAllocated >= payment.amount - 0.01
          ? "APPLIED"
          : totalAllocated > 0
          ? "PARTIAL"
          : "UNALLOCATED";

      await tx.payment.update({
        where: { id: paymentId },
        data: { allocatedAmount: totalAllocated, unallocatedAmount: unallocated, status: paymentStatus },
      });

      return { paymentId, totalAllocated, unallocated, strategy: strategy.name };
    });
  },

  async update(id: string, data: Partial<CreatePaymentInput>) {
    return paymentRepository.update(id, data);
  },

  async delete(id: string) {
    return paymentRepository.delete(id);
  },
};

export { paymentService };
