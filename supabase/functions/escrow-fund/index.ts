// POST /functions/v1/escrow-fund  { collaborationId: string }
// Brand funds escrow for a paid collaboration (spec §7 step 2). Creates a
// Razorpay Payment Link; escrow_status only flips to 'held' once
// razorpay-webhook confirms the payment actually succeeded — this endpoint
// just returns the checkout URL.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getCallerProfile } from "../_shared/supabaseClient.ts";
import { createEscrowPaymentLink, isRazorpayConfigured } from "../_shared/razorpay.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.collaborationId) return jsonResponse({ error: "collaborationId is required" }, { status: 400 });

    const caller = await getCallerProfile(req);
    if (!caller) return jsonResponse({ error: "Not authenticated" }, { status: 401 });

    const supabase = getServiceClient();
    const { data: collab, error } = await supabase.from("collaborations").select("*").eq("id", body.collaborationId).single();
    if (error) throw error;

    if (caller.id !== collab.brand_id && caller.role !== "admin") {
      return jsonResponse({ error: "Only the brand on this collaboration can fund escrow." }, { status: 403 });
    }
    if (!collab.agreed_amount) {
      return jsonResponse({ error: "This collaboration has no agreed amount (barter deals don't use escrow)." }, { status: 400 });
    }
    if (!isRazorpayConfigured()) {
      return jsonResponse({ error: "Razorpay is not configured yet. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET as Edge Function secrets." }, { status: 424 });
    }

    const { data: brand } = await supabase.from("brand_profiles").select("company_name").eq("user_id", collab.brand_id).single();

    const { paymentLinkId, checkoutUrl } = await createEscrowPaymentLink({
      amountInRupees: collab.agreed_amount,
      collaborationId: collab.id,
      description: `InfluenceOS escrow — collaboration ${collab.id}`,
      customerName: brand?.company_name ?? "Brand",
      customerEmail: caller.email,
    });

    await supabase
      .from("collaborations")
      .update({ escrow_payment_id: paymentLinkId, escrow_amount: collab.agreed_amount })
      .eq("id", collab.id);

    return jsonResponse({ success: true, checkoutUrl });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
