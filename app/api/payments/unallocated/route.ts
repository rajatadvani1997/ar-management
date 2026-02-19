import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["UNALLOCATED", "PARTIAL"] },
      unallocatedAmount: { gt: 0 },
      ...(customerId && { customerId }),
    },
    include: { customer: { select: { name: true, customerCode: true } } },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}
