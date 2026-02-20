/**
 * Customer Service — Use-Case / Orchestration Layer
 *
 * SRP  — handles customer use-cases only.
 * DIP  — calls repository abstraction, not raw Prisma.
 */

import { customerRepository, type CustomerFilters } from "@/lib/repositories/customer.repository";
import { generateCustomerCode, generateInvoiceNumber } from "@/lib/business/sequence-generator";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import prisma from "@/lib/prisma";

export interface CreateCustomerInput {
  name: string;
  contactPerson?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  defaultPaymentTermDays?: number;
  ownedById?: string | null;
  openingBalance?: number;
}

const customerService = {
  async list(filters: CustomerFilters) {
    return customerRepository.findMany(filters);
  },

  async getById(id: string) {
    return customerRepository.findByIdOrThrow(id);
  },

  async create(input: CreateCustomerInput) {
    const customerCode = await generateCustomerCode();
    const openingBalance = input.openingBalance ?? 0;

    const customer = await customerRepository.create({
      customerCode,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      alternatePhone: input.alternatePhone,
      email: input.email || null,
      address: input.address,
      creditLimit: input.creditLimit ?? 0,
      defaultPaymentTermDays: input.defaultPaymentTermDays ?? 30,
      ownedById: input.ownedById ?? null,
    });

    if (openingBalance > 0) {
      const invoiceNumber = await generateInvoiceNumber();
      const today = new Date();
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          invoiceDate: today,
          dueDate: today,
          subtotal: openingBalance,
          taxAmount: 0,
          totalAmount: openingBalance,
          balanceAmount: openingBalance,
          notes: "Opening Balance",
          lineItems: {
            create: [{
              description: "Opening Balance",
              quantity: 1,
              unitPrice: openingBalance,
              lineTotal: openingBalance,
            }],
          },
        },
      });
      await prisma.customer.update({
        where: { id: customer.id },
        data: { outstandingAmt: openingBalance, creditUsed: openingBalance },
      });
    }

    return customer;
  },

  async update(id: string, input: Partial<CreateCustomerInput>) {
    const { openingBalance, ...customerFields } = input;

    const customer = await customerRepository.update(id, {
      ...customerFields,
      email: customerFields.email === "" ? null : customerFields.email,
      ownedById: customerFields.ownedById,
    });

    if (openingBalance !== undefined) {
      const existing = await prisma.invoice.findFirst({
        where: { customerId: id, notes: "Opening Balance" },
      });

      if (existing) {
        if (openingBalance > 0) {
          const newBalance = Math.max(0, openingBalance - existing.paidAmount);
          const newStatus =
            newBalance === 0 ? "PAID" : existing.paidAmount > 0 ? "PARTIAL" : "UNPAID";
          await prisma.invoice.update({
            where: { id: existing.id },
            data: {
              subtotal: openingBalance,
              totalAmount: openingBalance,
              balanceAmount: newBalance,
              status: newStatus as any,
              lineItems: {
                updateMany: {
                  where: { invoiceId: existing.id },
                  data: { unitPrice: openingBalance, lineTotal: openingBalance },
                },
              },
            },
          });
        } else {
          // Zero out: only delete if no payment allocations exist
          const allocationCount = await prisma.paymentAllocation.count({
            where: { invoiceId: existing.id },
          });
          if (allocationCount === 0) {
            await prisma.invoice.delete({ where: { id: existing.id } });
          }
        }
      } else if (openingBalance > 0) {
        const invoiceNumber = await generateInvoiceNumber();
        const today = new Date();
        await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: id,
            invoiceDate: today,
            dueDate: today,
            subtotal: openingBalance,
            taxAmount: 0,
            totalAmount: openingBalance,
            balanceAmount: openingBalance,
            notes: "Opening Balance",
            lineItems: {
              create: [{
                description: "Opening Balance",
                quantity: 1,
                unitPrice: openingBalance,
                lineTotal: openingBalance,
              }],
            },
          },
        });
      }

      await recalculateCustomerTotals(id);
    }

    return customer;
  },

  async deactivate(id: string) {
    return customerRepository.deactivate(id);
  },
};

export { customerService };
