import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const payments = await prisma.payment.findMany({
    where: { customerId: id },
    include: { allocations: { include: { invoice: true } } },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}
