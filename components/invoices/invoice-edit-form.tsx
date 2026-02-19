"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface Props {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    paymentTermDays: number;
    totalAmount: number;
    paidAmount: number;
    referenceNumber: string | null;
    notes: string | null;
    status: string;
  };
}

export function InvoiceEditForm({ invoice }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [invoiceDate, setInvoiceDate] = useState(
    format(new Date(invoice.invoiceDate), "yyyy-MM-dd")
  );
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTermDays);
  const [dueDate, setDueDate] = useState(
    format(new Date(invoice.dueDate), "yyyy-MM-dd")
  );
  const [amount, setAmount] = useState<number | "">(invoice.totalAmount);

  // Auto-recalculate due date when invoice date or payment terms change
  useEffect(() => {
    if (invoiceDate) {
      setDueDate(format(addDays(new Date(invoiceDate), paymentTerms), "yyyy-MM-dd"));
    }
  }, [invoiceDate, paymentTerms]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount <= 0) {
      setError("Invoice amount must be greater than zero");
      return;
    }
    if (totalAmount < invoice.paidAmount) {
      setError(`Amount cannot be less than the already paid amount of ${formatCurrency(invoice.paidAmount)}`);
      return;
    }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      invoiceDate,
      dueDate,
      paymentTermDays: paymentTerms,
      totalAmount,
      referenceNumber: form.get("referenceNumber") || null,
      notes: form.get("notes") || null,
    };

    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to update invoice");
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
              <Label htmlFor="amount">Invoice Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min={invoice.paidAmount > 0 ? invoice.paidAmount : "1"}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="text-lg font-semibold"
              />
              {invoice.paidAmount > 0 && (
                <p className="text-xs text-blue-600">
                  Minimum {formatCurrency(invoice.paidAmount)} — already paid against this invoice.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Input
                type="number"
                min="0"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                name="referenceNumber"
                defaultValue={invoice.referenceNumber || ""}
                placeholder="PO/Order number..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={invoice.notes || ""}
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
