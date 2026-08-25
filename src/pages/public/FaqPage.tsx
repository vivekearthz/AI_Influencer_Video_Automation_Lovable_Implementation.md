import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Seo } from "@/components/seo/Seo";

const FAQS = [
  {
    q: "Is InfluenceOS really free for creators?",
    a: "Yes — always. Creators never pay a subscription fee or commission on barter deals. InfluenceOS makes money from brand subscriptions only.",
  },
  {
    q: "How does escrow protect me as a creator?",
    a: "For paid collaborations, the brand funds the agreed amount before you start delivering content. The funds are held by our payment partner and only released to you once the brand approves delivery — you're never chasing an unpaid invoice.",
  },
  {
    q: "What happens if a brand and creator disagree?",
    a: "Either party can flag a collaboration as disputed. Escrowed funds stay held (never released to either side) and the case routes to our admin team for manual resolution.",
  },
  {
    q: "Do I need a lawyer to review every contract?",
    a: "No — every accepted collaboration automatically generates a contract with deliverables, timeline, agreed amount, an explicit usage-rights window, and an ASCI-compliant sponsored-content disclosure clause.",
  },
  {
    q: "Why don't you ask for date of birth at signup?",
    a: "To minimize the personal data we collect on minors, we only require an 18+ self-certification checkbox instead of collecting a full date of birth.",
  },
  {
    q: "Is there a minimum campaign budget for brands?",
    a: "No. Unlike traditional agencies that often require ₹3-5L campaign minimums, InfluenceOS is built for startups and growth teams of any size.",
  },
];

export function FaqPage() {
  return (
    <>
      <Seo
        title="FAQ — InfluenceOS"
        description="Answers to common questions about InfluenceOS: pricing, escrow payments, dispute resolution, contracts, and compliance."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
