import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const promises = await prisma.promiseDate.findMany({
    where: {
      status: "PENDING",
      promisedDate: { gte: today, lt: tomorrow },
    },
    include: {
      customer: {
        select: { name: true, customerCode: true, phone: true, overdueAmt: true },
      },
    },
    orderBy: { promisedDate: "asc" },
  });

  return NextResponse.json({ promises });
}
