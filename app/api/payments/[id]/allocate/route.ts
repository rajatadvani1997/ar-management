import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { paymentAllocationSchema } from "@/lib/validators";
import { applyPaymentAllocation } from "@/lib/business/payment-allocation";
import { recalculateCustomerTotals } from "@/lib/business/customer-totals";
import { updateRiskFlag } from "@/lib/business/risk-flag";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = paymentAllocationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await applyPaymentAllocation(id, parsed.data.allocations);

    // Recalculate customer totals after allocation
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id } });
    await recalculateCustomerTotals(payment.customerId);
    await updateRiskFlag(payment.customerId);

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
