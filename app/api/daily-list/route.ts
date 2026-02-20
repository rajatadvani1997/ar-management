import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") || "overdue";
  const ownedById = searchParams.get("ownedById") || undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (section === "overdue") {
    const customers = await prisma.customer.findMany({
      where: { isActive: true, overdueAmt: { gt: 0 }, ...(ownedById && { ownedById }) },
      orderBy: { overdueAmt: "desc" },
      select: {
        id: true,
        customerCode: true,
        name: true,
        contactPerson: true,
        phone: true,
        overdueAmt: true,
        outstandingAmt: true,
        riskFlag: true,
        invoices: {
          where: { status: "OVERDUE" },
          select: { balanceAmount: true, dueDate: true, invoiceNumber: true },
        },
      },
    });
    return NextResponse.json({ items: customers });
  }

  if (section === "due-today") {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        dueDate: { gte: today, lt: tomorrow },
        ...(ownedById && { customer: { ownedById } }),
      },
      include: {
        customer: {
          select: { id: true, name: true, customerCode: true, phone: true, contactPerson: true },
        },
      },
      orderBy: { balanceAmount: "desc" },
    });
    return NextResponse.json({ items: invoices });
  }

  if (section === "promises-today") {
    const promises = await prisma.promiseDate.findMany({
      where: {
        status: "PENDING",
        promisedDate: { gte: today, lt: tomorrow },
        ...(ownedById && { customer: { ownedById } }),
      },
      include: {
        customer: {
          select: { id: true, name: true, customerCode: true, phone: true, contactPerson: true },
        },
      },
      orderBy: { promisedAmount: "desc" },
    });
    return NextResponse.json({ items: promises });
  }

  if (section === "broken-promises") {
    const promises = await prisma.promiseDate.findMany({
      where: { status: "BROKEN", ...(ownedById && { customer: { ownedById } }) },
      include: {
        customer: {
          select: { id: true, name: true, customerCode: true, phone: true, riskFlag: true },
        },
      },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items: promises });
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}
