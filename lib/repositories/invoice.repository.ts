/**
 * Invoice Repository — Data Access Layer
 *
 * SOLID:
 *  SRP  — sole responsibility: read/write Invoice rows; no business rules.
 *  DIP  — service layer depends on this interface, not on raw Prisma.
 *  OCP  — add new query methods here without touching business logic.
 *  ISP  — callers import only the shape they need (InvoiceRepository type).
 */

import { PrismaClient, InvoiceStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { PaginatedResult } from "@/lib/repositories/types";
export type { PaginatedResult };

export interface InvoiceFilters {
  customerId?: string;
  status?: InvoiceStatus;
  search?: string;
  ownedById?: string;
  page?: number;
  pageSize?: number;
}

export type InvoiceWithRelations = Awaited<
  ReturnType<typeof invoiceRepository.findById>
>;

// ---------- factory — injects the db client (DIP) ----------
function createInvoiceRepository(db: PrismaClient) {
  return {
    async findMany(filters: InvoiceFilters = {}): Promise<PaginatedResult<any>> {
      const { customerId, status, search, ownedById, page = 1, pageSize = 20 } = filters;
      const skip = (page - 1) * pageSize;

      const where = {
        ...(customerId && { customerId }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { invoiceNumber: { contains: search } },
            { referenceNumber: { contains: search } },
          ],
        }),
        ...(ownedById && { customer: { ownedById } }),
      };

      // Single round-trip: count + data in parallel
      const [total, data] = await Promise.all([
        db.invoice.count({ where }),
        db.invoice.findMany({
          where,
          include: {
            customer: { select: { name: true, customerCode: true } },
            lineItems: true,
          },
          orderBy: { invoiceDate: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    async findById(id: string) {
      return db.invoice.findUnique({
        where: { id },
        include: {
          customer: true,
          lineItems: true,
          allocations: { include: { payment: true } },
        },
      });
    },

    async findByIdOrThrow(id: string) {
      return db.invoice.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          lineItems: true,
          allocations: { include: { payment: true } },
        },
      });
    },

    async findUnpaidByCustomer(customerId: string) {
      return db.invoice.findMany({
        where: {
          customerId,
          status: { notIn: ["PAID", "WRITTEN_OFF"] },
        },
        orderBy: { dueDate: "asc" }, // oldest first — used by FIFO strategy
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          dueDate: true,
          status: true,
        },
      });
    },

    async create(data: Parameters<typeof db.invoice.create>[0]["data"]) {
      return db.invoice.create({ data, include: { lineItems: true } });
    },

    async update(id: string, data: Parameters<typeof db.invoice.update>[0]["data"]) {
      return db.invoice.update({ where: { id }, data });
    },

    async delete(id: string) {
      return db.invoice.delete({ where: { id } });
    },
  };
}

// Default singleton bound to the shared Prisma client
export const invoiceRepository = createInvoiceRepository(prisma);

// Named export of the factory for tests (inject a mock db)
export { createInvoiceRepository };
export type InvoiceRepository = ReturnType<typeof createInvoiceRepository>;
