"use client";

/**
 * InvoiceForm — optimised for Web Vitals.
 *
 * INP / re-render improvements:
 *  - useCallback wraps all event handlers → stable references → no child re-renders.
 *  - useMemo for derived state (creditWarning, selectedCustomer) → no wasteful recomputes.
 *  - creditWarning computed inline (pure fn) instead of a useEffect → removes a render cycle.
 *
 * CLS improvements:
 *  - Alert container has min-h-[44px] so the form doesn't jump when alerts appear/disappear.
 */

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Pure function — extracted so it can be unit-tested independently (SRP).
function computeCreditWarning(
  customer: Customer | undefined,
  totalAmount: number
): { message: string; isError: boolean } | null {
  if (!customer || totalAmount === 0 || customer.creditLimit === 0) return null;
  const projected = customer.outstandingAmt + totalAmount;
  const pct = (projected / customer.creditLimit) * 100;
  if (projected > customer.creditLimit) {
    return {
      message: `This invoice will EXCEED the credit limit of ${formatCurrency(customer.creditLimit)}. Projected usage: ${formatCurrency(projected)} (${pct.toFixed(0)}%)`,
      isError: true,
    };
  }
  if (pct >= 80) {
    return {
      message: `Credit utilization will reach ${pct.toFixed(0)}% (Limit: ${formatCurrency(customer.creditLimit)})`,
      isError: false,
    };
  }
  return null;
}

// Memoised list item — prevents every option re-rendering when parent state changes.
const CustomerOption = memo(function CustomerOption({ customer }: { customer: Customer }) {
  return (
    <SelectItem value={customer.id}>
      {customer.name} ({customer.customerCode})
    </SelectItem>
  );
});

export function InvoiceForm({ customers, defaultCustomerId, defaultPaymentTerms = 30 }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [paymentTerms, setPaymentTerms] = useState(defaultPaymentTerms);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(
    format(addDays(new Date(), defaultPaymentTerms), "yyyy-MM-dd")
  );
  const [amount, setAmount] = useState<number | "">("");

  // useMemo: avoids recomputing on every unrelated state change
  const totalAmount = useMemo(() => Number(amount) || 0, [amount]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  // Derived synchronously — no useEffect needed, eliminates an extra render cycle
  const creditWarning = useMemo(
    () => computeCreditWarning(selectedCustomer, totalAmount),
    [selectedCustomer, totalAmount]
  );

  // Sync payment terms when customer changes
  useEffect(() => {
    if (selectedCustomer) setPaymentTerms(selectedCustomer.defaultPaymentTermDays);
  }, [selectedCustomer]);

  // Auto-calculate due date when invoice date or terms change
  useEffect(() => {
    if (invoiceDate) {
      setDueDate(format(addDays(new Date(invoiceDate), paymentTerms), "yyyy-MM-dd"));
    }
  }, [invoiceDate, paymentTerms]);

  // Stable handler references (useCallback) — prevents child Input re-renders
  const handleCustomerChange = useCallback((value: string) => setCustomerId(value), []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value === "" ? "" : Number(e.target.value));
  }, []);

  const handleInvoiceDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInvoiceDate(e.target.value),
    []
  );

  const handleDueDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value),
    []
  );

  const handlePaymentTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPaymentTerms(Number(e.target.value)),
    []
  );

  const handleCancel = useCallback(() => router.back(), [router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
        let errorMsg = "Failed to create invoice";
        try {
          const data = await res.json();
          if (typeof data.error === "string") errorMsg = data.error;
        } catch {}
        setError(errorMsg);
        setLoading(false);
      }
    },
    [customerId, totalAmount, invoiceDate, dueDate, paymentTerms, router]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* min-h prevents CLS when alerts appear / disappear */}
      <div className="min-h-[44px]">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!error && creditWarning && (
          <Alert variant={creditWarning.isError ? "destructive" : "warning"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{creditWarning.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <CustomerOption key={c.id} customer={c} />
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
                onChange={handleAmountChange}
                required
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={handleInvoiceDateChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms (days)</Label>
              <Input
                type="number"
                min="0"
                value={paymentTerms}
                onChange={handlePaymentTermsChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={handleDueDateChange} />
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
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
