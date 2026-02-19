"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2 } from "lucide-react";

export function UndoWriteOffButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUndo() {
    if (!confirm("Restore this invoice? Its status will be recalculated based on payments and due date.")) return;
    setLoading(true);
    await fetch(`/api/invoices/${invoiceId}/write-off`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleUndo} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
      Undo Write-Off
    </Button>
  );
}
