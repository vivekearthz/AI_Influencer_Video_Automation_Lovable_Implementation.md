export const PRICING_TIERS = [
  {
    key: "starter",
    name: "Starter",
    price: "₹4,999/mo",
    highlighted: false,
    highlights: ["Up to 3 active campaigns", "Basic discovery filters", "Escrow-backed payments", "Standard contract templates"],
  },
  {
    key: "growth",
    name: "Growth",
    price: "₹14,999/mo",
    highlighted: true,
    highlights: ["Up to 15 active campaigns", "Advanced discovery + saved searches", "Priority creator matching", "Dispute resolution support"],
  },
  {
    key: "scale",
    name: "Scale",
    price: "₹34,999/mo",
    highlighted: false,
    highlights: ["Unlimited active campaigns", "Multi-seat team access", "Dedicated account support", "Custom contract clauses"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Talk to us",
    highlighted: false,
    highlights: ["Custom SLAs & invoicing", "API access", "White-label reporting", "Dedicated success manager"],
  },
] as const;
