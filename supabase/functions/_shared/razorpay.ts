// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Razorpay client (spec §7 subscription + escrow flow). Every export first
// checks whether RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are configured and
// throws a clear "not configured" error rather than pretending payments
// work — callers surface that to the UI instead of faking success.
// -----------------------------------------------------------------------------

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return Boolean(Deno.env.get("RAZORPAY_KEY_ID") && Deno.env.get("RAZORPAY_KEY_SECRET"));
}

function authHeader(): string {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

async function razorpayFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RAZORPAY_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Razorpay API error (${res.status}): ${json?.error?.description ?? JSON.stringify(json)}`);
  }
  return json;
}

const PLAN_ID_ENV: Record<string, string> = {
  starter: "RAZORPAY_PLAN_ID_STARTER",
  growth: "RAZORPAY_PLAN_ID_GROWTH",
  scale: "RAZORPAY_PLAN_ID_SCALE",
};

export async function createSubscriptionCheckout(input: { tier: string; customerEmail: string; customerName: string }) {
  const planEnvVar = PLAN_ID_ENV[input.tier];
  const planId = planEnvVar ? Deno.env.get(planEnvVar) : undefined;
  if (!planId) {
    throw new Error(`No Razorpay plan configured for tier "${input.tier}" (set ${planEnvVar ?? "RAZORPAY_PLAN_ID_*"}).`);
  }

  const subscription = await razorpayFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // ~10 years of monthly billing; effectively "until cancelled"
      notes: { customer_email: input.customerEmail, customer_name: input.customerName },
    }),
  });

  return { subscriptionId: subscription.id, checkoutUrl: subscription.short_url as string };
}

export async function createEscrowPaymentLink(input: {
  amountInRupees: number;
  collaborationId: string;
  description: string;
  customerName: string;
  customerEmail?: string;
}) {
  const link = await razorpayFetch("/payment_links", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amountInRupees * 100),
      currency: "INR",
      description: input.description,
      customer: { name: input.customerName, email: input.customerEmail },
      notify: { sms: false, email: Boolean(input.customerEmail) },
      notes: { collaboration_id: input.collaborationId },
      callback_method: "get",
    }),
  });

  return { paymentLinkId: link.id as string, checkoutUrl: link.short_url as string };
}

/**
 * Payout to a creator's linked Razorpay account (Route). Requires the
 * creator to have a linked account id captured out-of-band (e.g. via
 * Razorpay's onboarding flow) and stored somewhere accessible to this
 * function — left as a TODO hook since full Route onboarding is a
 * separate, merchant-specific integration.
 */
export async function payoutToLinkedAccount(input: { linkedAccountId: string; amountInRupees: number; notes?: Record<string, string> }) {
  return razorpayFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      account: input.linkedAccountId,
      amount: Math.round(input.amountInRupees * 100),
      currency: "INR",
      notes: input.notes ?? {},
    }),
  });
}

export async function refundPaymentLink(paymentId: string, amountInRupees?: number) {
  return razorpayFetch(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify(amountInRupees ? { amount: Math.round(amountInRupees * 100) } : {}),
  });
}

export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret || !signature) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}
