import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/studio/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUpsertBrandProfile } from "@/hooks/useBrandProfile";
import { supabase } from "@/lib/supabase";
import { PRICING_TIERS } from "@/lib/pricing";
import type { SubscriptionTier } from "@/types/database";

export function BrandOnboardingPage() {
  const { refreshProfile } = useAuth();
  const upsertBrand = useUpsertBrandProfile();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [tier, setTier] = React.useState<SubscriptionTier>("starter");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName) {
      toast.error("Company name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await upsertBrand.mutateAsync({
        company_name: companyName,
        industry,
        website,
        gstin: gstin || null,
        subscription_tier: tier,
      });

      const { data, error } = await supabase.functions.invoke("razorpay-subscription-checkout", {
        body: { tier },
      });

      if (error || data?.error) {
        toast.warning(
          "Profile saved, but Razorpay checkout isn't configured yet — your subscription is pending until billing is set up. See Billing in your dashboard."
        );
      } else if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      await refreshProfile();
      navigate("/dashboard/brand");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save company details");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Brand onboarding" description="Tell us about your company and pick a plan." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="D2C, SaaS, FMCG…" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN (optional)</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Choose a plan</CardTitle>
            <CardDescription>You can change tiers any time from Billing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {PRICING_TIERS.filter((t) => t.key !== "enterprise").map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTier(t.key as SubscriptionTier)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  tier === t.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  {tier === t.key && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{t.price}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Setting up…" : "Continue to checkout"}
        </Button>
      </form>
    </div>
  );
}
