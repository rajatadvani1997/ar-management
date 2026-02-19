import prisma from "@/lib/prisma";

export async function recalculateCustomerTotals(customerId: string) {
  const [outstandingResult, overdueResult] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { balanceAmount: true },
      where: {
        customerId,
        status: { notIn: ["PAID", "WRITTEN_OFF"] },
      },
    }),
    prisma.invoice.aggregate({
      _sum: { balanceAmount: true },
      where: { customerId, status: "OVERDUE" },
    }),
  ]);

  const outstandingAmt = outstandingResult._sum.balanceAmount ?? 0;
  const overdueAmt = overdueResult._sum.balanceAmount ?? 0;

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
