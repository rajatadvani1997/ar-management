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
import { Phone, Loader2 } from "lucide-react";

interface Props {
  customerId: string;
  customerName: string;
}

export function CallLogDialog({ customerId, customerName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [promiseMade, setPromiseMade] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!callStatus) { setError("Please select a call status"); return; }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body: any = {
      customerId,
      callStatus,
      notes: form.get("notes") || undefined,
      nextCallDate: form.get("nextCallDate") ? form.get("nextCallDate") as string : undefined,
      promiseMade,
    };

    if (promiseMade) {
      const rawAmt = form.get("promisedAmount") as string;
      if (rawAmt) body.promisedAmount = parseFloat(rawAmt);
      body.promisedDate = form.get("promisedDate") as string;
      body.promiseNotes = form.get("promiseNotes") || undefined;
    }

    const res = await fetch("/api/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setOpen(false);
      setCallStatus("");
      setPromiseMade(false);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to save call log");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Phone className="h-4 w-4 mr-1" />Log Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call — {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-2">
            <Label>Call Status *</Label>
            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Call notes..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextCallDate">Next Call Date</Label>
            <Input id="nextCallDate" name="nextCallDate" type="date" />
          </div>

          {callStatus === "CONNECTED" && (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={promiseMade}
                  onChange={(e) => setPromiseMade(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Customer made a payment promise
              </label>
              {promiseMade && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="promisedAmount">Amount (₹)</Label>
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
              Save Call Log
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
