"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_MODES = [
  { value: "CASH",   label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "NEFT",   label: "NEFT" },
  { value: "RTGS",   label: "RTGS" },
  { value: "IMPS",   label: "IMPS" },
  { value: "UPI",    label: "UPI" },
  { value: "OTHER",  label: "Other" },
];

interface Props {
  payment: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number;
    allocatedAmount: number;
    paymentMode: string;
    referenceNumber: string | null;
    bankName: string | null;
    notes: string | null;
  };
}

export function PaymentEditForm({ payment }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [paymentDate, setPaymentDate] = useState(
    format(new Date(payment.paymentDate), "yyyy-MM-dd")
  );
  const [paymentMode, setPaymentMode] = useState(payment.paymentMode);
  const [amount, setAmount] = useState<number | "">(payment.amount);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    if (totalAmount < payment.allocatedAmount) {
      setError(`Amount cannot be less than the already allocated amount of ${formatCurrency(payment.allocatedAmount)}`);
      return;
    }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      paymentDate,
      paymentMode,
      amount: totalAmount,
      referenceNumber: form.get("referenceNumber") || null,
      bankName: form.get("bankName") || null,
      notes: form.get("notes") || null,
    };

    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push(`/payments/${payment.id}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to update payment");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min={payment.allocatedAmount > 0 ? payment.allocatedAmount : "0.01"}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="text-lg font-semibold"
              />
              {payment.allocatedAmount > 0 && (
                <p className="text-xs text-blue-600">
                  Minimum {formatCurrency(payment.allocatedAmount)} — already allocated against invoices.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference / Cheque No.</Label>
              <Input
                name="referenceNumber"
                defaultValue={payment.referenceNumber || ""}
                placeholder="Transaction / cheque number..."
              />
            </div>

            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                name="bankName"
                defaultValue={payment.bankName || ""}
                placeholder="Bank name..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={payment.notes || ""}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
