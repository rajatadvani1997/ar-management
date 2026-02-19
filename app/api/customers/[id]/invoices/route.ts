import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const invoices = await prisma.invoice.findMany({
    where: { customerId: id },
    include: { lineItems: true, allocations: { include: { payment: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  return NextResponse.json({ invoices });
}
