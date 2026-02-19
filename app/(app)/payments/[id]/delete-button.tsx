"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm("Permanently delete this payment? Any invoice allocations will be reversed. This cannot be undone.")) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/payments");
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to delete payment");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
        Delete
      </Button>
      {error && <p className="text-xs text-red-600 mt-1 text-right">{error}</p>}
    </div>
  );
}
