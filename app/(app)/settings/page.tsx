import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  let settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: { id: "GLOBAL" } });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">System configuration (Admin only)</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
