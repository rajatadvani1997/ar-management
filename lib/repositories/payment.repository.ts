/**
 * Payment Repository — Data Access Layer
 *
 * SRP  — only payment CRUD; allocation math lives in the strategy layer.
 * DIP  — services and strategies talk to this interface, not raw Prisma.
 */

import { PrismaClient, PaymentStatus } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export interface PaymentFilters {
  customerId?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

function createPaymentRepository(db: PrismaClient) {
  return {
    async findMany(filters: PaymentFilters = {}) {
      const { customerId, status, page = 1, pageSize = 20 } = filters;
      const skip = (page - 1) * pageSize;

      const where = {
        ...(customerId && { customerId }),
        ...(status && { status }),
      };

      const [total, data] = await Promise.all([
        db.payment.count({ where }),
        db.payment.findMany({
          where,
          include: {
            customer: { select: { name: true, customerCode: true } },
            allocations: { include: { invoice: true } },
          },
          orderBy: { paymentDate: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    async findById(id: string) {
      return db.payment.findUnique({
        where: { id },
        include: {
          customer: true,
          allocations: { include: { invoice: true } },
        },
      });
    },

    async findByIdOrThrow(id: string) {
      return db.payment.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          allocations: { include: { invoice: true } },
        },
      });
    },

    async findUnallocated() {
      return db.payment.findMany({
        where: { status: { in: ["UNALLOCATED", "PARTIAL"] } },
        include: {
          customer: { select: { name: true, customerCode: true } },
        },
        orderBy: { paymentDate: "desc" },
      });
    },

    async create(data: Parameters<typeof db.payment.create>[0]["data"]) {
      return db.payment.create({ data });
    },

    async update(id: string, data: Parameters<typeof db.payment.update>[0]["data"]) {
      return db.payment.update({ where: { id }, data });
    },

    async delete(id: string) {
      return db.payment.delete({ where: { id } });
    },
  };
}

export const paymentRepository = createPaymentRepository(prisma);
export { createPaymentRepository };
export type PaymentRepository = ReturnType<typeof createPaymentRepository>;
