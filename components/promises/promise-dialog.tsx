"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";

interface PromiseDialogProps {
  customerId: string;
  /** If provided, dialog is in edit mode */
  promise?: {
    id: string;
    promisedAmount: number | null;
    promisedDate: Date | string;
    notes: string | null;
    status: string;
  };
}

export function PromiseDialog({ customerId, promise }: PromiseDialogProps) {
  const router = useRouter();
  const isEdit = !!promise;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toDateInput = (d: Date | string | undefined) => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().split("T")[0];
  };

  const [promisedDate, setPromisedDate] = useState(
    isEdit ? toDateInput(promise!.promisedDate) : ""
  );
  const [promisedAmount, setPromisedAmount] = useState(
    isEdit && promise!.promisedAmount != null ? String(promise!.promisedAmount) : ""
  );
  const [notes, setNotes] = useState(isEdit ? (promise!.notes ?? "") : "");
  const [status, setStatus] = useState(isEdit ? promise!.status : "PENDING");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!promisedDate) { setError("Promise date is required"); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        promisedDate,
        notes: notes || null,
        promisedAmount: promisedAmount ? parseFloat(promisedAmount) : null,
      };
      if (!isEdit && !promisedAmount) delete body.promisedAmount;
      if (isEdit) body.status = status;
      if (!isEdit) body.customerId = customerId;

      const url = isEdit ? `/api/promises/${promise!.id}` : "/api/promises";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        const err = data.error;
        if (typeof err === "string") {
          setError(err);
        } else if (err?.fieldErrors) {
          const msgs = Object.values(err.fieldErrors as Record<string, string[]>).flat();
          setError(msgs.length ? msgs.join(", ") : "Validation error");
        } else {
          setError("Failed to save promise");
        }
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (val) {
      // Reset to current values on open
      setPromisedDate(isEdit ? toDateInput(promise!.promisedDate) : "");
      setPromisedAmount(isEdit && promise!.promisedAmount != null ? String(promise!.promisedAmount) : "");
      setNotes(isEdit ? (promise!.notes ?? "") : "");
      setStatus(isEdit ? promise!.status : "PENDING");
      setError("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Promise</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Promise" : "Add Promise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">Promise Date *</label>
            <input
              type="date"
              value={promisedDate}
              onChange={(e) => setPromisedDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Amount (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={promisedAmount}
              onChange={(e) => setPromisedAmount(e.target.value)}
              placeholder="Leave blank if unspecified"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isEdit && (
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">Pending</option>
                <option value="KEPT">Kept</option>
                <option value="BROKEN">Broken</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Promise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
