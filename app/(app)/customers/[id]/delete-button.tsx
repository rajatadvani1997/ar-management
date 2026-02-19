"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface Props {
  customerId: string;
  hasOutstanding: boolean;
}

export function DeleteCustomerButton({ customerId, hasOutstanding }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const warning = hasOutstanding
      ? "This customer has an outstanding balance. "
      : "";
    if (!confirm(`${warning}Deactivate this customer? They will no longer appear in active lists.`)) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/customers");
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to delete customer");
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
