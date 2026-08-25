// POST /functions/v1/razorpay-subscription-checkout  { tier: "starter"|"growth"|"scale" }
// Brand subscription checkout (spec §7 step 1).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getCallerProfile } from "../_shared/supabaseClient.ts";
import { createSubscriptionCheckout, isRazorpayConfigured } from "../_shared/razorpay.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.tier) return jsonResponse({ error: "tier is required" }, { status: 400 });

    const caller = await getCallerProfile(req);
    if (!caller || caller.role !== "brand") {
      return jsonResponse({ error: "Only brand accounts can start a subscription checkout." }, { status: 403 });
    }

    if (!isRazorpayConfigured()) {
      return jsonResponse({ error: "Razorpay is not configured yet. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET as Edge Function secrets." }, { status: 424 });
    }

    const supabase = getServiceClient();
    const { data: brand } = await supabase.from("brand_profiles").select("company_name").eq("user_id", caller.id).maybeSingle();

    const { subscriptionId, checkoutUrl } = await createSubscriptionCheckout({
      tier: body.tier,
      customerEmail: caller.email,
      customerName: brand?.company_name ?? caller.full_name ?? "Brand",
    });

    await supabase
      .from("brand_profiles")
      .update({ razorpay_subscription_id: subscriptionId, subscription_tier: body.tier, subscription_status: "trialing" })
      .eq("user_id", caller.id);

    return jsonResponse({ success: true, checkoutUrl });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
