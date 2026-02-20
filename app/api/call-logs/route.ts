import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { callLogCreateSchema } from "@/lib/validators";
import { updateRiskFlag } from "@/lib/business/risk-flag";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";

  const callLogs = await prisma.callLog.findMany({
    where: { ...(customerId && { customerId }) },
    include: {
      customer: { select: { name: true, customerCode: true } },
      calledBy: { select: { name: true } },
      promise: true,
    },
    orderBy: { callDate: "desc" },
    take: 100,
  });

  return NextResponse.json({ callLogs });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = callLogCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userId = (session!.user as any).id;

  const { promiseMade, promisedAmount, promisedDate, promiseNotes, callDate, nextCallDate, ...callData } = parsed.data;

  try {
    let promise = null;
    if (promiseMade && promisedDate) {
      promise = await prisma.promiseDate.create({
        data: {
          customer: { connect: { id: parsed.data.customerId } },
          ...(promisedAmount != null && { promisedAmount }),
          promisedDate,
          notes: promiseNotes,
          status: "PENDING",
        },
      });
    }

    const callLog = await prisma.callLog.create({
      data: {
        ...callData,
        callDate: callDate || new Date(),
        nextCallDate: nextCallDate || null,
        calledById: userId,
        promiseMade: promiseMade || false,
        ...(promise && { promiseDateId: promise.id }),
      },
      include: {
        calledBy: { select: { name: true } },
        promise: true,
      },
    });

    if (promise) {
      await updateRiskFlag(parsed.data.customerId);
    }

    return NextResponse.json({ callLog }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/call-logs error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to save call log" }, { status: 500 });
  }
}
