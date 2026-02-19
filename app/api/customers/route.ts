import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { customerCreateSchema } from "@/lib/validators";
import { generateCustomerCode } from "@/lib/business/sequence-generator";
import { updateRiskFlag } from "@/lib/business/risk-flag";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const riskFlag = searchParams.get("riskFlag") || "";
  const isActive = searchParams.get("isActive");

  const customers = await prisma.customer.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { customerCode: { contains: search } },
          { contactPerson: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
      ...(riskFlag && { riskFlag: riskFlag as any }),
      ...(isActive !== null && isActive !== undefined && { isActive: isActive === "true" }),
    },
    orderBy: [{ overdueAmt: "desc" }, { outstandingAmt: "desc" }],
  });

  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, contactPerson, phone, alternatePhone, email, address, creditLimit, defaultPaymentTermDays } = parsed.data;
  const customerCode = await generateCustomerCode();

  const customer = await prisma.customer.create({
    data: {
      customerCode,
      name,
      contactPerson,
      phone,
      alternatePhone,
      email: email || null,
      address,
      creditLimit: creditLimit || 0,
      defaultPaymentTermDays: defaultPaymentTermDays ?? 30,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
