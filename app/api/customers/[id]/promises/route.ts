import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const promises = await prisma.promiseDate.findMany({
    where: { customerId: id },
    orderBy: { promisedDate: "desc" },
  });

  return NextResponse.json({ promises });
}
