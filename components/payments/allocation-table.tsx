"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PaymentData {
  id: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
}

interface ExistingAllocation {
  invoiceId: string;
  amount: number;
}

interface Props {
  payment: PaymentData;
  invoices: InvoiceData[];
  existingAllocations: ExistingAllocation[];
}

export function AllocationTable({ payment, invoices, existingAllocations }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialAllocations: Record<string, number> = {};
  existingAllocations.forEach((a) => {
    initialAllocations[a.invoiceId] = a.amount;
  });

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (v || 0), 0);
  const remaining = payment.amount - totalAllocated;

  async function handleSave() {
    setLoading(true);
    setError("");

    const allocs = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, amount]) => ({ invoiceId, amount }));

    if (allocs.length === 0) {
      router.push(`/payments/${payment.id}`);
      return;
    }

    const res = await fetch(`/api/payments/${payment.id}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocations: allocs }),
    });

    if (res.ok) {
      router.push(`/payments/${payment.id}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Allocation failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-400">Payment</p>
          <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-400">Allocated</p>
          <p className="font-bold text-blue-600">{formatCurrency(totalAllocated)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-400">Remaining</p>
          <p className={`font-bold ${remaining < -0.01 ? "text-red-600" : "text-orange-600"}`}>{formatCurrency(remaining)}</p>
        </CardContent></Card>
      </div>

      {remaining < -0.01 && (
        <Alert variant="destructive">
          <AlertDescription>Total allocated exceeds payment amount by {formatCurrency(-remaining)}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Open Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-sm">No open invoices for this customer</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-600">Invoice</th>
                  <th className="text-left py-2 font-medium text-gray-600">Due</th>
                  <th className="text-right py-2 font-medium text-gray-600">Balance</th>
                  <th className="text-right py-2 font-medium text-gray-600">Allocate (₹)</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const sc = INVOICE_STATUS_CONFIG[inv.status as keyof typeof INVOICE_STATUS_CONFIG];
                  const existingAmt = initialAllocations[inv.id] || 0;
                  const maxAdditional = inv.balanceAmount - existingAmt + (allocations[inv.id] || 0);
                  const maxAlloc = Math.min(maxAdditional, remaining + (allocations[inv.id] || 0));
                  return (
                    <tr key={inv.id} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{inv.invoiceNumber}</div>
                        <span className={`text-xs rounded-full px-1.5 py-0.5 ${sc.className}`}>{sc.label}</span>
                      </td>
                      <td className="py-2 text-gray-500">{formatDate(inv.dueDate)}</td>
                      <td className="py-2 text-right">{formatCurrency(inv.balanceAmount)}</td>
                      <td className="py-2 text-right w-32">
                        <Input
                          type="number"
                          min="0"
                          max={Math.max(0, maxAdditional)}
                          step="0.01"
                          value={allocations[inv.id] ?? ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setAllocations((prev) => ({ ...prev, [inv.id]: val }));
                          }}
                          className="h-7 text-sm text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2 pl-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const canAlloc = Math.min(inv.balanceAmount, Math.max(0, remaining + (allocations[inv.id] || 0)));
                            setAllocations((prev) => ({ ...prev, [inv.id]: canAlloc }));
                          }}
                        >
                          Max
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading || remaining < -0.01}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Allocation
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  );
}
