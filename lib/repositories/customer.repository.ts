/**
 * Customer Repository — Data Access Layer
 *
 * SOLID:
 *  SRP  — sole responsibility: read/write Customer rows.
 *  DIP  — services depend on this interface, not on concrete Prisma calls.
 *  OCP  — extend query methods without modifying callers.
 */

import { PrismaClient, RiskFlag } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { PaginatedResult } from "@/lib/repositories/types";
export type { PaginatedResult };

export interface CustomerFilters {
  search?: string;
  riskFlag?: RiskFlag;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

function createCustomerRepository(db: PrismaClient) {
  return {
    async findMany(filters: CustomerFilters = {}): Promise<PaginatedResult<any>> {
      const { search, riskFlag, isActive, page = 1, pageSize = 20 } = filters;
      const skip = (page - 1) * pageSize;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { customerCode: { contains: search } },
            { contactPerson: { contains: search } },
            { phone: { contains: search } },
          ],
        }),
        ...(riskFlag && { riskFlag }),
        ...(isActive !== undefined && { isActive }),
      };

      // Single round-trip: count + data in parallel (mirrors invoice repository pattern)
      const [total, data] = await Promise.all([
        db.customer.count({ where }),
        db.customer.findMany({
          where,
          orderBy: [{ overdueAmt: "desc" }, { outstandingAmt: "desc" }],
          skip,
          take: pageSize,
        }),
      ]);

      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    },

    async findById(id: string) {
      return db.customer.findUnique({ where: { id } });
    },

    async findByIdOrThrow(id: string) {
      return db.customer.findUniqueOrThrow({ where: { id } });
    },

    async create(data: Parameters<typeof db.customer.create>[0]["data"]) {
      return db.customer.create({ data });
    },

    async update(id: string, data: Parameters<typeof db.customer.update>[0]["data"]) {
      return db.customer.update({ where: { id }, data });
    },

    /** Soft-delete: mark inactive rather than deleting rows */
    async deactivate(id: string) {
      return db.customer.update({ where: { id }, data: { isActive: false } });
    },
  };
}

export const customerRepository = createCustomerRepository(prisma);
export { createCustomerRepository };
export type CustomerRepository = ReturnType<typeof createCustomerRepository>;
