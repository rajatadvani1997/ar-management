/**
 * Payment Controller — thin route handler (SRP).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { paymentCreateSchema } from "@/lib/validators";
import { paymentService } from "@/lib/services/payment.service";
import { PaymentStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 20), 100);

  const result = await paymentService.list({
    customerId: searchParams.get("customerId") || undefined,
    status: (searchParams.get("status") as PaymentStatus) || undefined,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if ((session!.user as any).role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const payment = await paymentService.create(parsed.data);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}
