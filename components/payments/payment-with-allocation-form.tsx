"use client";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import { Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Customer { id: string; name: string; customerCode: string; }
interface Invoice {
  id: string; invoiceNumber: string; invoiceDate: string; dueDate: string;
  totalAmount: number; balanceAmount: number; status: string;
}

/** Memoised row — prevents all rows re-rendering when one allocation value changes. */
const AllocationRow = memo(function AllocationRow({
  invoice,
  value,
  maxAlloc,
  remaining,
  onChange,
}: {
  invoice: Invoice;
  value: number;
  maxAlloc: number;
  remaining: number;
  onChange: (invoiceId: string, amount: number) => void;
}) {
  const sc = INVOICE_STATUS_CONFIG[invoice.status as keyof typeof INVOICE_STATUS_CONFIG];
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(invoice.id, Math.min(Number(e.target.value), maxAlloc));
    },
    [invoice.id, maxAlloc, onChange]
  );
  const handleMax = useCallback(() => {
    const canAllocate = Math.min(invoice.balanceAmount, remaining + value);
    onChange(invoice.id, Math.max(0, canAllocate));
  }, [invoice.id, invoice.balanceAmount, remaining, value, onChange]);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">{invoice.invoiceNumber}</span>
          <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${sc.className}`}>{sc.label}</span>
        </div>
        <span className="text-sm font-medium">{formatCurrency(invoice.balanceAmount)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap">Allocate (₹):</Label>
        <Input
          type="number"
          min="0"
          max={maxAlloc}
          step="0.01"
          value={value || ""}
          onChange={handleChange}
          placeholder="0"
          className="h-8 text-sm"
        />
        <Button type="button" variant="ghost" size="sm" onClick={handleMax}>Max</Button>
      </div>
    </div>
  );
});

export function PaymentWithAllocationForm({
  customers,
  defaultCustomerId,
}: {
  customers: Customer[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"payment" | "allocate">("payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Memoised derived values — prevent recalculation on every unrelated state change
  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + v, 0),
    [allocations]
  );
  const remaining = useMemo(() => amount - totalAllocated, [amount, totalAllocated]);

  useEffect(() => {
    if (customerId) {
      fetch(`/api/customers/${customerId}/invoices`)
        .then((r) => r.json())
        .then((data) => {
          const open = (data.invoices || []).filter(
            (i: Invoice) => !["PAID", "WRITTEN_OFF"].includes(i.status)
          );
          setInvoices(open);
          setAllocations({});
        });
    }
  }, [customerId]);

  const handleCreatePayment = useCallback(async () => {
    if (!customerId) { setError("Select a customer"); return; }
    if (!amount || amount <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, paymentDate, amount, paymentMode, referenceNumber: referenceNumber || undefined, bankName: bankName || undefined, notes: notes || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedPaymentId(data.payment.id);
      setStep("allocate");
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to create payment");
    }
    setLoading(false);
  }, [customerId, amount, paymentDate, paymentMode, referenceNumber, bankName, notes]);

  const handleAllocate = useCallback(async () => {
    if (!createdPaymentId) return;
    const allocs = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, amt]) => ({ invoiceId, amount: amt }));

    if (allocs.length === 0) {
      // Skip allocation — go to payment detail
      router.push(`/payments/${createdPaymentId}`);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/payments/${createdPaymentId}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocations: allocs }),
    });

    if (res.ok) {
      router.push(`/payments/${createdPaymentId}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to allocate");
      setLoading(false);
    }
  }, [createdPaymentId, allocations, amount, router]);

  return (
    <div className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {step === "payment" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.customerCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" step="100" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CASH","CHEQUE","NEFT","RTGS","IMPS","UPI","OTHER"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference / Cheque Number</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleCreatePayment} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Save & Allocate
              </Button>
            </CardContent>
          </Card>

          {/* Invoice Preview */}
          {customerId && invoices.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Open Invoices Preview</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500 font-medium">Invoice</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b">
                        <td className="py-2">{inv.invoiceNumber} <span className="text-xs text-gray-400">Due {formatDate(inv.dueDate)}</span></td>
                        <td className="py-2 text-right font-medium">{formatCurrency(inv.balanceAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Allocation Step */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Allocate to Invoices</CardTitle>
              <p className="text-sm text-gray-500">
                Payment: {formatCurrency(amount)} · Remaining: <span className={remaining < 0 ? "text-red-600" : "text-green-600"}>{formatCurrency(remaining)}</span>
              </p>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-gray-400 text-sm">No open invoices for this customer.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <AllocationRow
                      key={inv.id}
                      invoice={inv}
                      value={allocations[inv.id] ?? 0}
                      maxAlloc={Math.min(inv.balanceAmount, amount)}
                      remaining={remaining}
                      onChange={(invoiceId, val) =>
                        setAllocations((prev) => ({ ...prev, [invoiceId]: val }))
                      }
                    />
                  ))}
                </div>
              )}
              {remaining < -0.01 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>Total allocated ({formatCurrency(totalAllocated)}) exceeds payment ({formatCurrency(amount)})</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3 mt-4">
                <Button onClick={handleAllocate} disabled={loading || remaining < -0.01} className="flex-1">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {totalAllocated > 0 ? "Apply Allocation" : "Skip (Allocate Later)"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Allocation Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Payment Amount</span><span className="font-medium">{formatCurrency(amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Allocated</span><span className="font-medium text-blue-600">{formatCurrency(totalAllocated)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-medium">Remaining</span><span className={`font-bold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(remaining)}</span></div>
              {Object.entries(allocations).filter(([_, v]) => v > 0).map(([iid, amt]) => {
                const inv = invoices.find((i) => i.id === iid);
                return inv ? (
                  <div key={iid} className="flex justify-between text-xs text-gray-500">
                    <span>{inv.invoiceNumber}</span><span>{formatCurrency(amt)}</span>
                  </div>
                ) : null;
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
