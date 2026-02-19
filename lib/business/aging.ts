import prisma from "@/lib/prisma";

export interface AgingBucket {
  current: number;     // not yet due
  bucket30: number;    // 1-30 days overdue
  bucket60: number;    // 31-60 days overdue
  bucket90: number;    // 61-90 days overdue
  bucket90Plus: number; // 90+ days overdue
  total: number;
}

export interface CustomerAging {
  customerId: string;
  customerCode: string;
  customerName: string;
  riskFlag: string;
  buckets: AgingBucket;
  maxOverdueDays: number;
}

export function calculateAgingBuckets(
  balanceAmount: number,
  dueDate: Date,
  today: Date = new Date()
): { bucket: keyof AgingBucket; daysOverdue: number } {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.floor(
    (today.getTime() - dueDate.getTime()) / msPerDay
  );

  if (daysOverdue <= 0) return { bucket: "current", daysOverdue };
  if (daysOverdue <= 30) return { bucket: "bucket30", daysOverdue };
  if (daysOverdue <= 60) return { bucket: "bucket60", daysOverdue };
  if (daysOverdue <= 90) return { bucket: "bucket90", daysOverdue };
  return { bucket: "bucket90Plus", daysOverdue };
}

export async function calculateAging(): Promise<CustomerAging[]> {
  const today = new Date();

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      customerCode: true,
      name: true,
      riskFlag: true,
      invoices: {
        where: { status: { notIn: ["PAID", "WRITTEN_OFF"] } },
        select: { balanceAmount: true, dueDate: true },
      },
    },
  });

  return customers.map((customer) => {
    const buckets: AgingBucket = {
      current: 0,
      bucket30: 0,
      bucket60: 0,
      bucket90: 0,
      bucket90Plus: 0,
      total: 0,
    };
    let maxOverdueDays = 0;

    for (const inv of customer.invoices) {
      const { bucket, daysOverdue } = calculateAgingBuckets(
        inv.balanceAmount,
        inv.dueDate,
        today
      );
      buckets[bucket] += inv.balanceAmount;
      buckets.total += inv.balanceAmount;
      if (daysOverdue > maxOverdueDays) maxOverdueDays = daysOverdue;
    }

    return {
      customerId: customer.id,
      customerCode: customer.customerCode,
      customerName: customer.name,
      riskFlag: customer.riskFlag,
      buckets,
      maxOverdueDays,
    };
  });
}
