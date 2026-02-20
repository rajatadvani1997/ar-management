import { z } from "zod";

// Customer
export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  defaultPaymentTermDays: z.number().min(0).default(30),
  ownedById: z.string().optional().nullable(),
  openingBalance: z.number().min(0).default(0),
});

export const customerUpdateSchema = customerCreateSchema.partial();

// Invoice
export const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  lineTotal: z.number().positive(),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1),
  invoiceDate: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)),
  paymentTermDays: z.number().min(0).default(30),
  subtotal: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().positive(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item required"),
});

export const invoiceUpdateSchema = z.object({
  invoiceDate: z.string().transform((s) => new Date(s)).optional(),
  dueDate: z.string().transform((s) => new Date(s)).optional(),
  paymentTermDays: z.number().min(0).optional(),
  totalAmount: z.number().positive().optional(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Payment
export const paymentCreateSchema = z.object({
  customerId: z.string().min(1),
  paymentDate: z.string().transform((s) => new Date(s)),
  amount: z.number().positive(),
  paymentMode: z.enum(["CASH", "CHEQUE", "NEFT", "RTGS", "IMPS", "UPI", "OTHER"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentUpdateSchema = z.object({
  paymentDate: z.string().transform((s) => new Date(s)).optional(),
  paymentMode: z.enum(["CASH", "CHEQUE", "NEFT", "RTGS", "IMPS", "UPI", "OTHER"]).optional(),
  amount: z.number().positive().optional(),
  referenceNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Payment Allocation
export const allocationItemSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

export const paymentAllocationSchema = z.object({
  allocations: z.array(allocationItemSchema).min(1),
});

// Call Log
export const callLogUpdateSchema = z.object({
  callStatus: z.enum([
    "CONNECTED",
    "NOT_REACHABLE",
    "CALL_BACK_LATER",
    "LEFT_MESSAGE",
    "WRONG_NUMBER",
  ]).optional(),
  callDate: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().optional().nullable(),
  nextCallDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  // Promise fields — used to create or update the linked promise
  promisedAmount: z.number().positive().optional().nullable(),
  promisedDate: z.string().transform((s) => new Date(s)).optional(),
  promiseNotes: z.string().optional().nullable(),
});

export const callLogCreateSchema = z.object({
  customerId: z.string().min(1),
  callDate: z.string().transform((s) => new Date(s)).optional(),
  callStatus: z.enum([
    "CONNECTED",
    "NOT_REACHABLE",
    "CALL_BACK_LATER",
    "LEFT_MESSAGE",
    "WRONG_NUMBER",
  ]),
  notes: z.string().optional(),
  nextCallDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  promiseMade: z.boolean().default(false),
  promisedAmount: z.number().positive().optional().nullable(),
  promisedDate: z.string().transform((s) => new Date(s)).optional(),
  promiseNotes: z.string().optional(),
});

// Promise
export const promiseCreateSchema = z.object({
  customerId: z.string().min(1),
  promisedAmount: z.number().positive().optional().nullable(),
  promisedDate: z.string().transform((s) => new Date(s)),
  notes: z.string().optional().nullable(),
});

export const promiseUpdateSchema = z.object({
  status: z.enum(["PENDING", "KEPT", "BROKEN"]).optional(),
  notes: z.string().optional().nullable(),
  promisedDate: z.string().transform((s) => new Date(s)).optional(),
  promisedAmount: z.number().positive().optional().nullable(),
});

// Settings
export const settingsUpdateSchema = z.object({
  defaultPaymentTerms: z.number().min(0).optional(),
  overdueGraceDays: z.number().min(0).optional(),
  watchlistThresholdPct: z.number().min(0).max(100).optional(),
  highRiskOverdueDays: z.number().min(0).optional(),
  brokenPromisesThreshold: z.number().min(1).optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  companyName: z.string().optional(),
});

// User
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "COLLECTOR", "VIEWER"]).default("COLLECTOR"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "COLLECTOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});
