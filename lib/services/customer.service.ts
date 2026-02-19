/**
 * Customer Service — Use-Case / Orchestration Layer
 *
 * SRP  — handles customer use-cases only.
 * DIP  — calls repository abstraction, not raw Prisma.
 */

import { customerRepository, type CustomerFilters } from "@/lib/repositories/customer.repository";
import { generateCustomerCode } from "@/lib/business/sequence-generator";

export interface CreateCustomerInput {
  name: string;
  contactPerson?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  defaultPaymentTermDays?: number;
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

    return customerRepository.create({
      customerCode,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      alternatePhone: input.alternatePhone,
      email: input.email || null,
      address: input.address,
      creditLimit: input.creditLimit ?? 0,
      defaultPaymentTermDays: input.defaultPaymentTermDays ?? 30,
    });
  },

  async update(id: string, input: Partial<CreateCustomerInput>) {
    return customerRepository.update(id, {
      ...input,
      email: input.email === "" ? null : input.email,
    });
  },

  async deactivate(id: string) {
    return customerRepository.deactivate(id);
  },
};

export { customerService };
