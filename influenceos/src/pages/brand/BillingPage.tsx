import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import { supabase } from "@/lib/supabase";
import { PRICING_TIERS } from "@/lib/pricing";
import type { SubscriptionTier } from "@/types/database";

export function BillingPage() {
  const { data: brand, refetch } = useBrandProfile();
  const [changingTier, setChangingTier] = React.useState<SubscriptionTier | null>(null);

  async function handleChangeTier(tier: SubscriptionTier) {
    setChangingTier(tier);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-subscription-checkout", { body: { tier } });
      if (error || data?.error) {
        toast.warning("Razorpay isn't configured in this environment yet — set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET as Edge Function secrets to enable real checkout.");
      } else if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setChangingTier(null);
    }
  }

  return (
    <div>
      <PageHeader title="Billing" description="Manage your InfluenceOS subscription." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span className="capitalize">{brand?.subscription_tier ?? "starter"}</span>
            <StatusBadge status={brand?.subscription_status ?? "none"} />
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_TIERS.filter((t) => t.key !== "enterprise").map((tier) => (
          <Card key={tier.key} className={brand?.subscription_tier === tier.key ? "border-primary" : undefined}>
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.price}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {tier.highlights.map((h) => <p key={h}>{h}</p>)}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={brand?.subscription_tier === tier.key ? "outline" : "default"}
                disabled={changingTier !== null}
                onClick={() => handleChangeTier(tier.key as SubscriptionTier)}
              >
                {brand?.subscription_tier === tier.key ? "Current plan" : changingTier === tier.key ? "Redirecting…" : "Switch plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
