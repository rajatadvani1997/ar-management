/**
 * Customer Controller — thin route handler (SRP).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { customerCreateSchema } from "@/lib/validators";
import { customerService } from "@/lib/services/customer.service";
import { RiskFlag } from "@/app/generated/prisma/client";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const isActiveParam = searchParams.get("isActive");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 20), 100);

  const result = await customerService.list({
    search: searchParams.get("search") || undefined,
    riskFlag: (searchParams.get("riskFlag") as RiskFlag) || undefined,
    isActive: isActiveParam !== null ? isActiveParam === "true" : undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ customers: result.data, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (session!.user.role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const customer = await customerService.create(parsed.data);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
