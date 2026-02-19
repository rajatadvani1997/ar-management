"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface PromiseDeleteButtonProps {
  promiseId: string;
}

export function PromiseDeleteButton({ promiseId }: PromiseDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/promises/${promiseId}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setError(data.error ?? "Failed to delete");
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        {error && <span className="text-xs text-red-600 mr-1">{error}</span>}
        <span className="text-xs text-gray-600 mr-1">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? "…" : "Yes"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => { setConfirming(false); setError(""); }}
          disabled={loading}
        >
          No
        </Button>
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
