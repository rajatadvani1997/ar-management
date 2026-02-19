/**
 * Payment Allocation Controller — thin route handler.
 *
 * Strategy Pattern usage:
 *  - ?strategy=fifo  → FifoAllocationStrategy (auto, oldest-first)
 *  - (default)       → ManualAllocationStrategy (user provides explicit items)
 *
 * The route only decides WHICH strategy to instantiate.
 * The PaymentService is unaware of the choice — it just calls strategy.allocate().
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { paymentAllocationSchema } from "@/lib/validators";
import { paymentService } from "@/lib/services/payment.service";
import { fifoStrategy } from "@/lib/strategies/allocation/fifo.strategy";
import { ManualAllocationStrategy } from "@/lib/strategies/allocation/manual.strategy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if ((session!.user as any).role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const strategyParam = searchParams.get("strategy");

  try {
    let result: Awaited<ReturnType<typeof paymentService.allocate>>;

    if (strategyParam === "fifo") {
      // Auto FIFO — no body required
      result = await paymentService.allocate(id, fifoStrategy);
    } else {
      // Manual — parse explicit allocation items from body
      const body = await req.json();
      const parsed = paymentAllocationSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      result = await paymentService.allocate(
        id,
        new ManualAllocationStrategy(parsed.data.allocations)
      );
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
