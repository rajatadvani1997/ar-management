import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { promiseCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const customerId = searchParams.get("customerId") || "";

  const promises = await prisma.promiseDate.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(customerId && { customerId }),
    },
    include: { customer: { select: { name: true, customerCode: true } } },
    orderBy: { promisedDate: "desc" },
  });

  return NextResponse.json({ promises });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = promiseCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { customerId, promisedAmount, promisedDate, notes } = parsed.data;
  try {
    const promise = await prisma.promiseDate.create({
      data: {
        customerId,
        promisedDate,
        notes: notes ?? null,
        promisedAmount: promisedAmount ?? null,
        status: "PENDING",
      },
    });
    return NextResponse.json({ promise }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/promises]", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create promise" }, { status: 500 });
  }
}
