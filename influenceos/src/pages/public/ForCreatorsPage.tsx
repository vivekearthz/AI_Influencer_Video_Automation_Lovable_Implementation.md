import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";

const BENEFITS = [
  "Free forever — no subscription, no hidden fees, no commission on barter deals",
  "Get discovered by brands actively looking for creators like you, not agencies gatekeeping access",
  "Escrow-backed payments: funds are held before you deliver, so you never chase an invoice",
  "Every collab comes with an auto-generated, ASCI-compliant contract with an explicit usage-rights window",
  "You control what you're contacted about — paid, barter, events, or all of the above",
  "Build a public rating history that compounds your credibility with every completed campaign",
];

export function ForCreatorsPage() {
  return (
    <>
      <Seo
        title="For Creators — Join InfluenceOS Free | InfluenceOS"
        description="Free for creators. Get discovered by brands, get paid on time with escrow protection, and know your rights on every collaboration."
      />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Built for creators, not just brands</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          InfluenceOS is free for creators, always. No subscription tiers, no pay-to-rank discovery — just a real
          marketplace where brands come to you.
        </p>

        <div className="mt-10 grid gap-4">
          {BENEFITS.map((b) => (
            <Card key={b}>
              <CardContent className="flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{b}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Ready to get discovered?</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link to="/signup?role=creator">Join Free as a Creator</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
