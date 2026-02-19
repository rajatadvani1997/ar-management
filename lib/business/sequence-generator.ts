import prisma from "@/lib/prisma";

// --- Why this matters (architecture note) ---
// Previous implementation: findMany() loaded ALL rows, then did JS reduce → O(n) reads.
// Fixed implementation: findFirst() with orderBy + single regex match → O(1) DB call.
// SRP: each function has exactly one job — produce the next sequence string.

function nextSeq(last: string | null | undefined, prefix: string): string {
  if (!last) return `${prefix}0001`;
  const match = last.match(new RegExp(`^${prefix}(\\d+)$`));
  const n = match ? parseInt(match[1], 10) : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}

export async function generateCustomerCode(): Promise<string> {
  const last = await prisma.customer.findFirst({
    orderBy: { customerCode: "desc" },
    select: { customerCode: true },
  });
  return nextSeq(last?.customerCode, "CUST-");
}

export async function generateInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  return nextSeq(last?.invoiceNumber, "INV-");
}

export async function generatePaymentNumber(): Promise<string> {
  const last = await prisma.payment.findFirst({
    orderBy: { paymentNumber: "desc" },
    select: { paymentNumber: true },
  });
  return nextSeq(last?.paymentNumber, "PAY-");
}
