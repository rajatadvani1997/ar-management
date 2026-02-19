import prisma from "@/lib/prisma";

export async function recalculateCustomerTotals(customerId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    select: { status: true, balanceAmount: true },
  });

  const outstandingAmt = invoices
    .filter((i) => !["PAID", "WRITTEN_OFF"].includes(i.status))
    .reduce((sum, i) => sum + i.balanceAmount, 0);

  const overdueAmt = invoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.balanceAmount, 0);

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      outstandingAmt,
      overdueAmt,
      creditUsed: outstandingAmt,
    },
  });

  return { outstandingAmt, overdueAmt };
}
