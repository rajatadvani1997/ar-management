"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
}

interface CustomerFormProps {
  initialData?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    phone: string;
    alternatePhone?: string | null;
    email?: string | null;
    address?: string | null;
    creditLimit: number;
    defaultPaymentTermDays: number;
    ownedById?: string | null;
    openingBalance?: number;
  };
  users?: User[];
  defaultOwnerId?: string;
}

export function CustomerForm({ initialData, users = [], defaultOwnerId }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const ownedByValue = form.get("ownedById") as string;
    const body = {
      name: form.get("name"),
      contactPerson: form.get("contactPerson") || undefined,
      phone: form.get("phone"),
      alternatePhone: form.get("alternatePhone") || undefined,
      email: form.get("email") || undefined,
      address: form.get("address") || undefined,
      creditLimit: parseFloat(form.get("creditLimit") as string) || 0,
      defaultPaymentTermDays: parseInt(form.get("defaultPaymentTermDays") as string) || 30,
      ownedById: ownedByValue || null,
      openingBalance: parseFloat(form.get("openingBalance") as string) || 0,
    };

    const url = isEdit ? `/api/customers/${initialData.id}` : "/api/customers";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/customers/${data.customer.id}`);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error?.fieldErrors ? "Please check the form fields" : data.error || "Something went wrong");
      setLoading(false);
    }
  }

  const currentOwnerId = initialData?.ownedById ?? defaultOwnerId ?? "";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" name="name" defaultValue={initialData?.name} required placeholder="ACME Corporation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" name="contactPerson" defaultValue={initialData?.contactPerson || ""} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" defaultValue={initialData?.phone} required placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternatePhone">Alternate Phone</Label>
              <Input id="alternatePhone" name="alternatePhone" defaultValue={initialData?.alternatePhone || ""} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={initialData?.email || ""} placeholder="accounts@company.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={initialData?.address || ""} placeholder="Company address..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
              <Input id="creditLimit" name="creditLimit" type="number" min="0" step="1000" defaultValue={initialData?.creditLimit || 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTermDays">Default Credit Days</Label>
              <Input id="defaultPaymentTermDays" name="defaultPaymentTermDays" type="number" min="0" step="1" defaultValue={initialData?.defaultPaymentTermDays ?? 30} placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
              <Input id="openingBalance" name="openingBalance" type="number" min="0" step="0.01" defaultValue={initialData?.openingBalance ?? 0} placeholder="0" />
              <p className="text-xs text-muted-foreground">Pre-existing balance owed by this customer</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ownedById">Assigned Owner</Label>
              <select
                id="ownedById"
                name="ownedById"
                defaultValue={currentOwnerId}
                className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Customer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
