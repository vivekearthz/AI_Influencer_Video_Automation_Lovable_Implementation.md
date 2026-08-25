import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";
import { PRICING_TIERS } from "@/lib/pricing";

export function PricingPage() {
  return (
    <>
      <Seo
        title="Pricing — InfluenceOS"
        description="Free for creators, always. Startup-friendly brand pricing with no ₹3-5L campaign minimums. Compare InfluenceOS plans."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-3xl font-bold sm:text-4xl">Simple, startup-friendly pricing</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Creators never pay. Brands pick the tier that matches how many campaigns they run — no agency-style
          campaign minimums.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <Card key={tier.key} className={tier.highlighted ? "border-primary shadow-md" : undefined}>
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">{tier.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tier.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {h}
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant={tier.highlighted ? "default" : "outline"}>
                  <Link to={tier.key === "enterprise" ? "/faq" : "/signup?role=brand"}>
                    {tier.key === "enterprise" ? "Talk to us" : "Get Started"}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card className="mt-12">
          <CardHeader>
            <CardTitle>For creators: always free</CardTitle>
            <CardDescription>
              No subscription, no commission on barter deals, no pay-to-rank discovery. InfluenceOS makes money from
              brand subscriptions, not by taking a cut of your work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/signup?role=creator">Join Free as a Creator</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
