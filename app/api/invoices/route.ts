/**
 * Invoice Controller — thin route handler.
 *
 * Responsibilities: parse HTTP request, delegate to service, return HTTP response.
 * NO business logic here (SRP). All business rules live in InvoiceService.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { invoiceCreateSchema } from "@/lib/validators";
import { invoiceService } from "@/lib/services/invoice.service";
import { InvoiceStatus } from "@/app/generated/prisma/client";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 20), 100);

  const result = await invoiceService.list({
    customerId: searchParams.get("customerId") || undefined,
    status: (searchParams.get("status") as InvoiceStatus) || undefined,
    search: searchParams.get("search") || undefined,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const invoice = await invoiceService.create(parsed.data);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
