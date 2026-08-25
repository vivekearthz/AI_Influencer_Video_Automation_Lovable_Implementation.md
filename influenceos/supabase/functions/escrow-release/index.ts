// POST /functions/v1/escrow-release  { collaborationId: string }
// Brand approves delivery and releases escrowed funds (spec §7 step 3).
// Falls back to a manual payout queue (escrow stays "held", collaboration
// still marked "approved") if Razorpay Route isn't configured yet — never
// silently pretends the payout happened.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getCallerProfile } from "../_shared/supabaseClient.ts";
import { isRazorpayConfigured, payoutToLinkedAccount } from "../_shared/razorpay.ts";

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
      return jsonResponse({ error: "Only the brand on this collaboration can approve delivery." }, { status: 403 });
    }
    if (collab.status !== "content_submitted") {
      return jsonResponse({ error: `Cannot approve delivery from status "${collab.status}".` }, { status: 400 });
    }

    // Barter deals (no escrow) just move straight to approved.
    if (!collab.agreed_amount || collab.escrow_status !== "held") {
      await supabase.from("collaborations").update({ status: "approved" }).eq("id", collab.id);
      await bumpCreatorCompletedCount(collab.creator_id);
      return jsonResponse({ success: true, status: "approved", payout: "not_applicable" });
    }

    const { data: creatorAccount } = await supabase
      .from("creator_profiles")
      .select("razorpay_linked_account_id")
      .eq("user_id", collab.creator_id)
      .single();

    // Payout account linking (Razorpay Route) is a separate onboarding flow
    // not yet wired up — until a linked_account_id is captured for the
    // creator, fall back to a manual payout queue (spec §7 step 3).
    const linkedAccountId: string | null = creatorAccount?.razorpay_linked_account_id ?? null;

    if (isRazorpayConfigured() && linkedAccountId) {
      await payoutToLinkedAccount({
        linkedAccountId,
        amountInRupees: collab.escrow_amount ?? collab.agreed_amount,
        notes: { collaboration_id: collab.id },
      });
      await supabase
        .from("collaborations")
        .update({ status: "paid", escrow_status: "released" })
        .eq("id", collab.id);
      await bumpCreatorCompletedCount(collab.creator_id);
      return jsonResponse({ success: true, status: "paid", payout: "released" });
    }

    await supabase.from("collaborations").update({ status: "approved" }).eq("id", collab.id);
    await bumpCreatorCompletedCount(collab.creator_id);
    return jsonResponse({
      success: true,
      status: "approved",
      payout: "manual_queue",
      message: "Delivery approved. Payout to the creator is queued for manual processing until a Razorpay Route linked account is configured.",
    });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});

async function bumpCreatorCompletedCount(creatorId: string) {
  const supabase = getServiceClient();
  const { data } = await supabase.from("creator_profiles").select("campaigns_completed_count").eq("user_id", creatorId).single();
  await supabase
    .from("creator_profiles")
    .update({ campaigns_completed_count: (data?.campaigns_completed_count ?? 0) + 1 })
    .eq("user_id", creatorId);
}
