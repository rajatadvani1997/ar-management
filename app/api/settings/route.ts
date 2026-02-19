import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireAuth } from "@/lib/auth";
import { settingsUpdateSchema } from "@/lib/validators";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  let settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: { id: "GLOBAL" } });
  }
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const settings = await prisma.systemSettings.upsert({
    where: { id: "GLOBAL" },
    create: { id: "GLOBAL", ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ settings });
}
