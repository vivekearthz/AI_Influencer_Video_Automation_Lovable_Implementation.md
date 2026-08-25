import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";
import { PRICING_TIERS } from "@/lib/pricing";

const BENEFITS = [
  "Search and filter creators by category, audience, follower range, and engagement quality — not just vanity metrics",
  "Escrow-backed payments protect both sides: funds release only once you approve delivery",
  "Every collaboration gets an auto-generated, ASCI/DPDP-compliant contract — no manual legal review needed",
  "Startup-friendly pricing with no ₹3-5L campaign minimums that legacy agencies require",
];

export function ForBrandsPage() {
  return (
    <>
      <Seo
        title="For Brands — Escrow-Protected Influencer Campaigns | InfluenceOS"
        description="Discover and collaborate with creators on InfluenceOS. Escrow-backed payments, auto-generated compliant contracts, and startup-friendly pricing."
      />
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Run campaigns you can actually trust</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          No ₹3-5L campaign minimums. No spreadsheets. No ghosting. Just a self-serve marketplace built for startups
          and growth teams.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <Card key={b}>
              <CardContent className="flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{b}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-16 text-center text-2xl font-semibold">Pricing snapshot</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <Card key={tier.key} className={tier.highlighted ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {tier.highlights.map((h) => <p key={h}>{h}</p>)}
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Full tier comparison on the <Link to="/pricing" className="text-primary hover:underline">pricing page</Link>.
        </p>
      </section>
    </>
  );
}
