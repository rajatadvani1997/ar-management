import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { callLogUpdateSchema } from "@/lib/validators";
import { updateRiskFlag } from "@/lib/business/risk-flag";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const callLog = await prisma.callLog.findUnique({
    where: { id },
    include: {
      customer: true,
      calledBy: { select: { name: true, email: true } },
      promise: true,
    },
  });
  if (!callLog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ callLog });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = callLogUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.callLog.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { promisedAmount, promisedDate, promiseNotes, ...callData } = parsed.data;

    let promiseDateId = existing.promiseDateId;
    let promiseMade = existing.promiseMade;
    let riskUpdateNeeded = false;

    if (promisedDate) {
      if (existing.promiseDateId) {
        // Update the existing linked promise
        await prisma.promiseDate.update({
          where: { id: existing.promiseDateId },
          data: {
            promisedAmount: promisedAmount ?? null,
            promisedDate,
            ...(promiseNotes !== undefined && { notes: promiseNotes }),
          },
        });
      } else {
        // Create a new promise and link it to this call log
        const promise = await prisma.promiseDate.create({
          data: {
            customer: { connect: { id: existing.customerId } },
            ...(promisedAmount != null && { promisedAmount }),
            promisedDate,
            notes: promiseNotes ?? undefined,
            status: "PENDING",
          },
        });
        promiseDateId = promise.id;
        promiseMade = true;
      }
      riskUpdateNeeded = true;
    }

    const callLog = await prisma.callLog.update({
      where: { id },
      data: { ...callData, promiseMade, promiseDateId },
    });

    if (riskUpdateNeeded) {
      await updateRiskFlag(existing.customerId);
    }

    return NextResponse.json({ callLog });
  } catch (err: any) {
    console.error("PATCH /api/call-logs/[id] error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to update call log" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const callLog = await prisma.callLog.findUnique({ where: { id } });
  if (!callLog) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.callLog.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
