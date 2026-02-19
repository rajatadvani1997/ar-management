import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const callLogs = await prisma.callLog.findMany({
    where: { customerId: id },
    include: { calledBy: { select: { name: true } }, promise: true },
    orderBy: { callDate: "desc" },
  });

  return NextResponse.json({ callLogs });
}
