import { NextRequest, NextResponse } from "next/server";
import { refreshAllInvoiceStatuses } from "@/lib/business/invoice-status";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import { updateRiskFlag } from "@/lib/business/risk-flag";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // Cron job — validate secret header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await refreshAllInvoiceStatuses();

  // Recalculate totals and risk for all active customers
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  // Parallelise across customers (totals must still precede risk within each customer)
  await Promise.all(
    customers.map(async (c) => {
      await recalculateCustomerTotals(c.id);
      await updateRiskFlag(c.id);
    })
  );

  return NextResponse.json({ updated, customersRefreshed: customers.length });
}
