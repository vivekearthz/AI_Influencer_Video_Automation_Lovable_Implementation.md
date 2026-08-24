import { ShieldCheck, Lock, FileCheck, ScrollText } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/seo/Seo";

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "Escrow-protected payments",
    body:
      "When a brand funds a paid collaboration, the money is held by our payment partner (Razorpay) before any content is delivered. It only releases to the creator once the brand explicitly approves delivery — or is refunded if a dispute is resolved in the brand's favor. Neither side has to trust the other's word alone.",
  },
  {
    icon: FileCheck,
    title: "ASCI-compliant disclosure clauses",
    body:
      "Every accepted collaboration auto-generates a contract that includes an ASCI-compliant sponsored-content disclosure clause, so creators and brands both stay on the right side of India's Advertising Standards Council of India guidelines without needing a lawyer for every deal.",
  },
  {
    icon: ScrollText,
    title: "Explicit usage rights, never \"forever\"",
    body:
      "Contracts always specify an explicit usage-rights duration that both parties agree to upfront. We never default to unlimited/perpetual usage rights — creators keep control of how long their content can be reused.",
  },
  {
    icon: Lock,
    title: "DPDP Act data processing consent",
    body:
      "We log a timestamped consent record for data processing under India's Digital Personal Data Protection (DPDP) Act at signup for every user. We never collect date of birth — only an 18+ self-certification — to minimize the personal data we hold on minors.",
  },
];

export function TrustCompliancePage() {
  return (
    <>
      <Seo
        title="Trust & Compliance — InfluenceOS"
        description="How InfluenceOS protects both creators and brands: escrow-backed payments, ASCI-compliant disclosure clauses, explicit usage rights, and DPDP Act consent logging."
      />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Trust &amp; Compliance</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This is the single biggest gap in influencer marketing today — and the reason InfluenceOS exists.
        </p>

        <div className="mt-10 grid gap-6">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <CardHeader className="flex flex-row items-start gap-3">
                <s.icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <CardTitle>{s.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-relaxed">{s.body}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
