"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";

export function WriteOffButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleWriteOff() {
    if (!confirm("Are you sure you want to write off this invoice? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}/write-off`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleWriteOff} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
      Write Off
    </Button>
  );
}
