import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { invoiceCreateSchema } from "@/lib/validators";
import { generateInvoiceNumber } from "@/lib/business/sequence-generator";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import { updateRiskFlag } from "@/lib/business/risk-flag";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(customerId && { customerId }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search } },
          { referenceNumber: { contains: search } },
        ],
      }),
    },
    include: {
      customer: { select: { name: true, customerCode: true } },
      lineItems: true,
    },
    orderBy: { invoiceDate: "desc" },
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { customerId, lineItems, ...invoiceData } = parsed.data;
  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      ...invoiceData,
      invoiceNumber,
      customerId,
      balanceAmount: invoiceData.totalAmount,
      lineItems: { create: lineItems },
    },
    include: { lineItems: true },
  });

  await recalculateCustomerTotals(customerId);
  await updateRiskFlag(customerId);

  return NextResponse.json({ invoice }, { status: 201 });
}
