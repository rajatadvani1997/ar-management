import prisma from "@/lib/prisma";

export async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `CUST-${String(count + 1).padStart(4, "0")}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function generatePaymentNumber(): Promise<string> {
  const count = await prisma.payment.count();
  return `PAY-${String(count + 1).padStart(4, "0")}`;
}
