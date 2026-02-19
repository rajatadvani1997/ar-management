import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { promiseUpdateSchema } from "@/lib/validators";
import { updateRiskFlag } from "@/lib/business/risk-flag";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const promise = await prisma.promiseDate.findUnique({ where: { id }, include: { customer: true } });
  if (!promise) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ promise });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = promiseUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updateData: any = { ...parsed.data };
  if (parsed.data.status && parsed.data.status !== "PENDING") {
    updateData.resolvedAt = new Date();
  }

  const promise = await prisma.promiseDate.update({ where: { id }, data: updateData });
  await updateRiskFlag(promise.customerId);

  return NextResponse.json({ promise });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const role = (session!.user as any).role;
  if (role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const promise = await prisma.promiseDate.findUnique({ where: { id } });
  if (!promise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear references from call logs before deleting
  await prisma.callLog.updateMany({
    where: { promiseDateId: id },
    data: { promiseDateId: null, promiseMade: false },
  });

  await prisma.promiseDate.delete({ where: { id } });
  await updateRiskFlag(promise.customerId);

  return NextResponse.json({ success: true });
}
