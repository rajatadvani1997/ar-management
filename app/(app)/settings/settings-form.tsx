"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save } from "lucide-react";

interface Settings {
  companyName: string;
  currency: string;
  currencySymbol: string;
  defaultPaymentTerms: number;
  overdueGraceDays: number;
  watchlistThresholdPct: number;
  highRiskOverdueDays: number;
  brokenPromisesThreshold: number;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const body = {
      companyName: form.get("companyName"),
      currency: form.get("currency"),
      currencySymbol: form.get("currencySymbol"),
      defaultPaymentTerms: parseInt(form.get("defaultPaymentTerms") as string),
      overdueGraceDays: parseInt(form.get("overdueGraceDays") as string),
      watchlistThresholdPct: parseFloat(form.get("watchlistThresholdPct") as string),
      highRiskOverdueDays: parseInt(form.get("highRiskOverdueDays") as string),
      brokenPromisesThreshold: parseInt(form.get("brokenPromisesThreshold") as string),
    };

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setError(data.error || "Failed to save settings");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {saved && <Alert variant="success"><AlertDescription>Settings saved successfully!</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Code</Label>
              <Input id="currency" name="currency" defaultValue={settings.currency} placeholder="INR" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input id="currencySymbol" name="currencySymbol" defaultValue={settings.currencySymbol} placeholder="₹" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice & Payment Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTerms">Default Payment Terms (days)</Label>
              <Input id="defaultPaymentTerms" name="defaultPaymentTerms" type="number" min="0" defaultValue={settings.defaultPaymentTerms} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overdueGraceDays">Overdue Grace Days</Label>
              <Input id="overdueGraceDays" name="overdueGraceDays" type="number" min="0" defaultValue={settings.overdueGraceDays} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Risk Thresholds</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="watchlistThresholdPct">Watchlist Credit Utilization (%)</Label>
              <Input id="watchlistThresholdPct" name="watchlistThresholdPct" type="number" min="0" max="100" defaultValue={settings.watchlistThresholdPct} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highRiskOverdueDays">High Risk Overdue Days</Label>
              <Input id="highRiskOverdueDays" name="highRiskOverdueDays" type="number" min="1" defaultValue={settings.highRiskOverdueDays} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokenPromisesThreshold">High Risk Broken Promises (90d)</Label>
              <Input id="brokenPromisesThreshold" name="brokenPromisesThreshold" type="number" min="1" defaultValue={settings.brokenPromisesThreshold} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Settings
      </Button>
    </form>
  );
}
