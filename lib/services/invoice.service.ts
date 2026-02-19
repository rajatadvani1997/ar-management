/**
 * Invoice Service — Use-Case / Orchestration Layer
 *
 * SOLID:
 *  SRP  — orchestrates invoice use-cases only; no raw DB calls.
 *  OCP  — new use-cases added as new methods; existing ones unchanged.
 *  DIP  — receives repository + eventBus via factory (not hard-coded imports).
 *
 * Design Pattern: Service Layer
 *  - Wraps all invoice business logic.
 *  - API routes become thin: parse → call service → respond.
 */

import { invoiceRepository, type InvoiceFilters } from "@/lib/repositories/invoice.repository";
import { generateInvoiceNumber } from "@/lib/business/sequence-generator";
import { computeInvoiceStatus, refreshAllInvoiceStatuses } from "@/lib/business/invoice-status";
import { eventBus, registerDomainHandlers } from "@/lib/events/domain-events";
import prisma from "@/lib/prisma";

// Ensure handlers are wired up (lazy, idempotent)
registerDomainHandlers();

export interface CreateInvoiceInput {
  customerId: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTermDays: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  referenceNumber?: string;
  notes?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export interface UpdateInvoiceInput {
  invoiceDate?: Date;
  dueDate?: Date;
  paymentTermDays?: number;
  referenceNumber?: string | null;
  notes?: string | null;
}

const invoiceService = {
  async list(filters: InvoiceFilters) {
    return invoiceRepository.findMany(filters);
  },

  async getById(id: string) {
    return invoiceRepository.findById(id);
  },

  async create(input: CreateInvoiceInput) {
    const { customerId, lineItems, ...invoiceData } = input;

    const [invoiceNumber, customer] = await Promise.all([
      generateInvoiceNumber(),
      prisma.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { creditLimit: true, outstandingAmt: true },
      }),
    ]);

    const status = computeInvoiceStatus(invoiceData.totalAmount, 0, invoiceData.dueDate, "UNPAID");

    const invoice = await invoiceRepository.create({
      ...invoiceData,
      invoiceNumber,
      customerId,
      status,
      balanceAmount: invoiceData.totalAmount,
      lineItems: { create: lineItems },
    });

    // Emit event — handlers recalculate totals + risk asynchronously
    await eventBus.emit({
      type: "INVOICE_CREATED",
      customerId,
      invoiceId: invoice.id,
      totalAmount: invoiceData.totalAmount,
    });

    // Credit limit breach notification (fire-and-forget)
    const projectedOutstanding = customer.outstandingAmt + invoiceData.totalAmount;
    if (customer.creditLimit > 0 && projectedOutstanding > customer.creditLimit) {
      eventBus.emitSafe({
        type: "CREDIT_LIMIT_BREACHED",
        customerId,
        creditLimit: customer.creditLimit,
        outstandingAmt: projectedOutstanding,
      });
    }

    return invoice;
  },

  async update(id: string, input: UpdateInvoiceInput) {
    return invoiceRepository.update(id, input);
  },

  async writeOff(id: string) {
    const invoice = await invoiceRepository.findByIdOrThrow(id);
    if (invoice.status === "WRITTEN_OFF") throw new Error("Already written off");

    await invoiceRepository.update(id, { status: "WRITTEN_OFF" });

    await eventBus.emit({
      type: "INVOICE_CREATED", // reuse event to trigger totals recalc
      customerId: invoice.customerId,
      invoiceId: id,
      totalAmount: 0,
    });
  },

  async undoWriteOff(id: string) {
    const invoice = await invoiceRepository.findByIdOrThrow(id);
    if (invoice.status !== "WRITTEN_OFF") throw new Error("Invoice is not written off");

    const newStatus = computeInvoiceStatus(
      invoice.totalAmount,
      invoice.paidAmount,
      invoice.dueDate,
      "UNPAID"
    );
    await invoiceRepository.update(id, { status: newStatus });

    await eventBus.emit({
      type: "INVOICE_CREATED",
      customerId: invoice.customerId,
      invoiceId: id,
      totalAmount: invoice.totalAmount,
    });
  },

  async delete(id: string) {
    const invoice = await invoiceRepository.findByIdOrThrow(id);
    await invoiceRepository.delete(id);
    await eventBus.emit({
      type: "INVOICE_CREATED",
      customerId: invoice.customerId,
      invoiceId: id,
      totalAmount: 0,
    });
  },

  async refreshAllStatuses() {
    return refreshAllInvoiceStatuses();
  },
};

export { invoiceService };
