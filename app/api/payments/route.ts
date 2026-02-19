import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { paymentCreateSchema } from "@/lib/validators";
import { generatePaymentNumber } from "@/lib/business/sequence-generator";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  const status = searchParams.get("status") || "";

  const payments = await prisma.payment.findMany({
    where: {
      ...(customerId && { customerId }),
      ...(status && { status: status as any }),
    },
    include: {
      customer: { select: { name: true, customerCode: true } },
      allocations: { include: { invoice: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const paymentNumber = await generatePaymentNumber();

  const payment = await prisma.payment.create({
    data: {
      ...parsed.data,
      paymentNumber,
      allocatedAmount: 0,
      unallocatedAmount: parsed.data.amount,
      status: "UNALLOCATED",
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
