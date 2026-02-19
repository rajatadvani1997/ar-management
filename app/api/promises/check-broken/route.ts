import { NextRequest, NextResponse } from "next/server";
import { detectAndMarkBrokenPromises } from "@/lib/business/promise-tracking";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const marked = await detectAndMarkBrokenPromises();
  return NextResponse.json({ marked });
}
