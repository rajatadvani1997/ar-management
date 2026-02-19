import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const promises = await prisma.promiseDate.findMany({
    where: { status: "BROKEN" },
    include: {
      customer: {
        select: { name: true, customerCode: true, phone: true, overdueAmt: true, riskFlag: true },
      },
    },
    orderBy: { resolvedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ promises });
}
