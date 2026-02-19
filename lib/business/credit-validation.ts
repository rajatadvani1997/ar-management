import prisma from "@/lib/prisma";

export interface CreditValidationResult {
  isValid: boolean;
  warning: boolean;
  creditLimit: number;
  currentUsed: number;
  projectedUsed: number;
  utilizationPct: number;
  message?: string;
}

export async function validateCreditLimit(
  customerId: string,
  newInvoiceAmount: number,
  excludeInvoiceId?: string
): Promise<CreditValidationResult> {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { creditLimit: true, outstandingAmt: true },
  });

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "GLOBAL" },
  });

  const watchlistPct = settings?.watchlistThresholdPct ?? 80;

  // If there's an invoice to exclude (for editing), get its balance
  let excludeAmount = 0;
  if (excludeInvoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: excludeInvoiceId },
      select: { balanceAmount: true },
    });
    excludeAmount = inv?.balanceAmount ?? 0;
  }

  const currentUsed = customer.outstandingAmt - excludeAmount;
  const projectedUsed = currentUsed + newInvoiceAmount;
  const creditLimit = customer.creditLimit;

  if (creditLimit === 0) {
    return {
      isValid: true,
      warning: false,
      creditLimit: 0,
      currentUsed,
      projectedUsed,
      utilizationPct: 0,
    };
  }

  const utilizationPct = (projectedUsed / creditLimit) * 100;

  if (projectedUsed > creditLimit) {
    return {
      isValid: false,
      warning: true,
      creditLimit,
      currentUsed,
      projectedUsed,
      utilizationPct,
      message: `This invoice would exceed the credit limit of ₹${creditLimit.toLocaleString()}. Projected usage: ₹${projectedUsed.toLocaleString()} (${utilizationPct.toFixed(0)}%)`,
    };
  }

  if (utilizationPct >= watchlistPct) {
    return {
      isValid: true,
      warning: true,
      creditLimit,
      currentUsed,
      projectedUsed,
      utilizationPct,
      message: `Credit utilization will be ${utilizationPct.toFixed(0)}% (Warning threshold: ${watchlistPct}%)`,
    };
  }

  return {
    isValid: true,
    warning: false,
    creditLimit,
    currentUsed,
    projectedUsed,
    utilizationPct,
  };
}
