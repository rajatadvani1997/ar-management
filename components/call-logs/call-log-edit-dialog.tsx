"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Loader2 } from "lucide-react";

interface Promise {
  id: string;
  promisedAmount: number | null;
  promisedDate: Date;
  notes: string | null;
  status: string;
}

interface Props {
  callLog: {
    id: string;
    callStatus: string;
    callDate: Date;
    notes: string | null;
    nextCallDate: Date | null;
    promise: Promise | null;
  };
}

export function CallLogEditDialog({ callLog }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState(callLog.callStatus);
  const [addPromise, setAddPromise] = useState(false);

  function toDateInputValue(date: Date | null | undefined) {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body: any = { callStatus };

    const callDate = form.get("callDate") as string;
    if (callDate) body.callDate = callDate;

    const notes = form.get("notes") as string;
    body.notes = notes || null;

    const nextCallDate = form.get("nextCallDate") as string;
    body.nextCallDate = nextCallDate || null;

    // Include promise fields when editing an existing promise or adding a new one
    const showPromise = callLog.promise || addPromise;
    if (showPromise) {
      const rawAmt = form.get("promisedAmount") as string;
      const promisedDate = form.get("promisedDate") as string;
      if (!promisedDate) {
        setError("Promise date is required");
        setLoading(false);
        return;
      }
      if (rawAmt) body.promisedAmount = parseFloat(rawAmt);
      body.promisedDate = promisedDate;
      body.promiseNotes = (form.get("promiseNotes") as string) || null;
    }

    const res = await fetch(`/api/call-logs/${callLog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setOpen(false);
      setAddPromise(false);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to update call log");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setAddPromise(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Call Log</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-2">
            <Label>Call Status *</Label>
            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONNECTED">Connected</SelectItem>
                <SelectItem value="NOT_REACHABLE">Not Reachable</SelectItem>
                <SelectItem value="CALL_BACK_LATER">Call Back Later</SelectItem>
                <SelectItem value="LEFT_MESSAGE">Left Message</SelectItem>
                <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callDate">Call Date</Label>
            <Input id="callDate" name="callDate" type="date" defaultValue={toDateInputValue(callLog.callDate)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={callLog.notes ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextCallDate">Next Call Date</Label>
            <Input id="nextCallDate" name="nextCallDate" type="date" defaultValue={toDateInputValue(callLog.nextCallDate)} />
          </div>

          {/* Promise section — always shown if existing, or toggle to add */}
          {callLog.promise ? (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                Edit Promise
                <span className={`ml-2 text-xs font-semibold ${
                  callLog.promise.status === "KEPT" ? "text-green-600" :
                  callLog.promise.status === "BROKEN" ? "text-red-600" : "text-yellow-600"
                }`}>({callLog.promise.status})</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="promisedAmount">Amount</Label>
                  <Input
                    id="promisedAmount"
                    name="promisedAmount"
                    type="number"
                    min="1"
                    step="100"
                    defaultValue={callLog.promise.promisedAmount ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="promisedDate">By Date *</Label>
                  <Input
                    id="promisedDate"
                    name="promisedDate"
                    type="date"
                    defaultValue={toDateInputValue(callLog.promise.promisedDate)}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="promiseNotes">Promise Notes</Label>
                  <Input
                    id="promiseNotes"
                    name="promiseNotes"
                    defaultValue={callLog.promise.notes ?? ""}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={addPromise}
                  onChange={(e) => setAddPromise(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Add a payment promise
              </label>
              {addPromise && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="promisedAmount">Amount</Label>
                    <Input id="promisedAmount" name="promisedAmount" type="number" min="1" step="100" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="promisedDate">By Date *</Label>
                    <Input id="promisedDate" name="promisedDate" type="date" required />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="promiseNotes">Promise Notes</Label>
                    <Input id="promiseNotes" name="promiseNotes" placeholder="Optional notes..." />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
