import prisma from "@/lib/prisma";
import { RiskFlag } from "@/app/generated/prisma/client";

export async function updateRiskFlag(customerId: string): Promise<RiskFlag> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "GLOBAL" },
  });

  const highRiskOverdueDays = settings?.highRiskOverdueDays ?? 60;
  const brokenThreshold = settings?.brokenPromisesThreshold ?? 2;
  const watchlistPct = settings?.watchlistThresholdPct ?? 80;

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { creditLimit: true, outstandingAmt: true, overdueAmt: true },
  });

  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Max overdue days
  const overdueInvoices = await prisma.invoice.findMany({
    where: { customerId, status: "OVERDUE" },
    select: { dueDate: true },
  });
  const maxOverdueDays = overdueInvoices.reduce((max, inv) => {
    const days = Math.floor(
      (today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(max, days);
  }, 0);

  // Broken promises in last 90 days
  const brokenPromises = await prisma.promiseDate.count({
    where: {
      customerId,
      status: "BROKEN",
      resolvedAt: { gte: ninetyDaysAgo },
    },
  });

  const creditLimit = customer.creditLimit || 1;
  const creditUtilizationPct = (customer.outstandingAmt / creditLimit) * 100;
  const hasAnyOverdue = customer.overdueAmt > 0;
  const hasAnyBrokenPromise = brokenPromises > 0;

  let riskFlag: RiskFlag;

  if (
    maxOverdueDays >= highRiskOverdueDays ||
    brokenPromises >= brokenThreshold ||
    creditUtilizationPct >= 100
  ) {
    riskFlag = "HIGH_RISK";
  } else if (
    hasAnyOverdue ||
    creditUtilizationPct >= watchlistPct ||
    hasAnyBrokenPromise
  ) {
    riskFlag = "WATCHLIST";
  } else {
    riskFlag = "SAFE";
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { riskFlag },
  });

  return riskFlag;
}
