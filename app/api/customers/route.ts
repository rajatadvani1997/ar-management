/**
 * Customer Controller — thin route handler (SRP).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { customerCreateSchema } from "@/lib/validators";
import { customerService } from "@/lib/services/customer.service";
import { RiskFlag } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const isActiveParam = searchParams.get("isActive");

  const customers = await customerService.list({
    search: searchParams.get("search") || undefined,
    riskFlag: (searchParams.get("riskFlag") as RiskFlag) || undefined,
    isActive: isActiveParam !== null ? isActiveParam === "true" : undefined,
  });

  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if ((session!.user as any).role === "VIEWER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const customer = await customerService.create(parsed.data);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}
