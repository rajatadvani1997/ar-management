import prisma from "@/lib/prisma";
import { updateRiskFlag } from "./risk-flag";

export async function detectAndMarkBrokenPromises(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const brokenPromises = await prisma.promiseDate.findMany({
    where: {
      status: "PENDING",
      promisedDate: { lt: today },
    },
    select: { id: true, customerId: true },
  });

  if (brokenPromises.length === 0) return 0;

  // Mark all as BROKEN
  await prisma.promiseDate.updateMany({
    where: { id: { in: brokenPromises.map((p) => p.id) } },
    data: { status: "BROKEN", resolvedAt: new Date() },
  });

  // Update risk flags for affected customers
  const customerIds = [...new Set(brokenPromises.map((p) => p.customerId))];
  for (const customerId of customerIds) {
    await updateRiskFlag(customerId);
  }

  return brokenPromises.length;
}
