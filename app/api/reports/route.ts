import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateAging } from "@/lib/business/aging";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "aging";

  if (type === "aging") {
    const aging = await calculateAging();
    return NextResponse.json({ aging });
  }

  if (type === "outstanding") {
    const customers = await prisma.customer.findMany({
      where: { outstandingAmt: { gt: 0 }, isActive: true },
      select: {
        id: true,
        customerCode: true,
        name: true,
        outstandingAmt: true,
        overdueAmt: true,
        creditLimit: true,
        riskFlag: true,
      },
      orderBy: { outstandingAmt: "desc" },
      take: 20,
    });
    return NextResponse.json({ customers });
  }

  if (type === "credit-utilization") {
    const customers = await prisma.customer.findMany({
      where: { creditLimit: { gt: 0 }, isActive: true },
      select: {
        id: true,
        customerCode: true,
        name: true,
        creditLimit: true,
        creditUsed: true,
        outstandingAmt: true,
        riskFlag: true,
      },
      orderBy: { creditUsed: "desc" },
    });
    const withPct = customers.map((c) => ({
      ...c,
      utilizationPct: c.creditLimit > 0 ? (c.creditUsed / c.creditLimit) * 100 : 0,
    }));
    return NextResponse.json({ customers: withPct });
  }

  if (type === "collections") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const payments = await prisma.payment.findMany({
      where: { paymentDate: { gte: thirtyDaysAgo } },
      include: {
        customer: { select: { name: true, customerCode: true } },
        allocations: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    const total = payments.reduce((s, p) => s + p.amount, 0);
    return NextResponse.json({ payments, total });
  }

  if (type === "promise-performance") {
    const [pending, kept, broken] = await Promise.all([
      prisma.promiseDate.count({ where: { status: "PENDING" } }),
      prisma.promiseDate.count({ where: { status: "KEPT" } }),
      prisma.promiseDate.count({ where: { status: "BROKEN" } }),
    ]);
    const total = pending + kept + broken;
    return NextResponse.json({
      pending,
      kept,
      broken,
      total,
      keptRate: total > 0 ? ((kept / total) * 100).toFixed(1) : "0",
      brokenRate: total > 0 ? ((broken / total) * 100).toFixed(1) : "0",
    });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
