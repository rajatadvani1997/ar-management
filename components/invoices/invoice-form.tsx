"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Loader2, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";

interface Customer {
  id: string;
  name: string;
  customerCode: string;
  creditLimit: number;
  outstandingAmt: number;
  defaultPaymentTermDays: number;
}

interface Props {
  customers: Customer[];
  defaultCustomerId?: string;
  defaultPaymentTerms?: number;
}

export function InvoiceForm({ customers, defaultCustomerId, defaultPaymentTerms = 30 }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [paymentTerms, setPaymentTerms] = useState(defaultPaymentTerms);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), defaultPaymentTerms), "yyyy-MM-dd"));
  const [amount, setAmount] = useState<number | "">("");
  const [creditWarning, setCreditWarning] = useState<{ message: string; isError: boolean } | null>(null);

  const totalAmount = Number(amount) || 0;
  const selectedCustomer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    if (selectedCustomer) {
      setPaymentTerms(selectedCustomer.defaultPaymentTermDays);
    }
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedCustomer || totalAmount === 0) { setCreditWarning(null); return; }
    const projected = selectedCustomer.outstandingAmt + totalAmount;
    const limit = selectedCustomer.creditLimit;
    if (limit === 0) { setCreditWarning(null); return; }
    const pct = (projected / limit) * 100;
    if (projected > limit) {
      setCreditWarning({ message: `This invoice will EXCEED the credit limit of ${formatCurrency(limit)}. Projected usage: ${formatCurrency(projected)} (${pct.toFixed(0)}%)`, isError: true });
    } else if (pct >= 80) {
      setCreditWarning({ message: `Credit utilization will reach ${pct.toFixed(0)}% (Limit: ${formatCurrency(limit)})`, isError: false });
    } else {
      setCreditWarning(null);
    }
  }, [customerId, totalAmount, selectedCustomer]);

  useEffect(() => {
    if (invoiceDate) {
      setDueDate(format(addDays(new Date(invoiceDate), paymentTerms), "yyyy-MM-dd"));
    }
  }, [invoiceDate, paymentTerms]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer"); return; }
    if (!totalAmount || totalAmount <= 0) { setError("Please enter a valid invoice amount"); return; }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      customerId,
      invoiceDate,
      dueDate,
      paymentTermDays: paymentTerms,
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount,
      referenceNumber: form.get("referenceNumber") || undefined,
      notes: form.get("notes") || undefined,
      lineItems: [
        { description: "Invoice", quantity: 1, unitPrice: totalAmount, lineTotal: totalAmount },
      ],
    };

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to create invoice");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {creditWarning && (
        <Alert variant={creditWarning.isError ? "destructive" : "warning"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{creditWarning.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.customerCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="amount">Invoice Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Input type="number" min="0" value={paymentTerms} onChange={(e) => setPaymentTerms(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input name="referenceNumber" placeholder="PO/Order number..." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Additional notes..." rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || totalAmount === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Invoice
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
