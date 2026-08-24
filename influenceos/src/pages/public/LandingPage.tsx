import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, FileText, Sparkles, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";

const PAIN_POINTS = [
  {
    title: "Creators are invisible",
    body: "Talented creators get discovered through DMs and luck, not a real marketplace — and rarely know their own rights around usage and payment.",
  },
  {
    title: "Brands can't find ROI",
    body: "Agencies charge ₹3-5L minimums and follower-count vanity metrics dominate discovery, leaving startups priced out of influencer marketing entirely.",
  },
  {
    title: "Trust & compliance gaps",
    body: "No escrow means creators chase payments for months, and missing ASCI disclosure clauses create real legal exposure for brands.",
  },
];

const DIFFERENTIATORS = [
  "Two-way self-serve marketplace — not a form-to-agency funnel",
  "Escrow-backed payments so nobody chases invoices",
  "Auto-generated, ASCI/DPDP-compliant contracts on every collab",
  "Matching by engagement quality, not raw follower count",
  "Startup-friendly pricing — no ₹3-5L campaign minimums",
];

export function LandingPage() {
  return (
    <>
      <Seo
        title="InfluenceOS — Where Creators and Brands Actually Trust Each Other"
        description="Free for creators. Compliant, escrow-protected influencer marketing campaigns for brands. No spreadsheets, no ghosting, no unpaid usage rights."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "InfluenceOS",
            description: "A two-sided, escrow-protected marketplace connecting creators and brands.",
            url: "https://influenceos.example.com",
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Influencer marketing marketplace",
            provider: { "@type": "Organization", name: "InfluenceOS" },
            areaServed: "IN",
          },
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Where Creators and Brands <span className="text-primary">Actually Trust</span> Each Other
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Free for creators. Compliant, escrow-protected campaigns for brands. No spreadsheets, no ghosting, no
          unpaid usage rights.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link to="/signup?role=creator">I&apos;m a Creator — Join Free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/signup?role=brand">I&apos;m a Brand — Start a Campaign <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">The problem with influencer marketing today</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAIN_POINTS.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{p.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">How InfluenceOS is different</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <li key={d} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Users2 className="mb-2 h-6 w-6 text-primary" />
            <CardTitle>For Creators</CardTitle>
            <CardDescription>Free forever. Get discovered, get paid on time, know your rights.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/for-creators">Learn more <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="mb-2 h-6 w-6 text-primary" />
            <CardTitle>For Brands</CardTitle>
            <CardDescription>Escrow-backed campaigns with startup-friendly pricing — no agency minimums.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/for-brands">See pricing <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
        <h2 className="text-2xl font-semibold">Ready to build campaigns people actually trust?</h2>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/signup">Get Started Free</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/faq">Read the FAQ</Link></Button>
        </div>
      </section>
    </>
  );
}
