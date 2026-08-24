// POST /functions/v1/dispute-resolve  { collaborationId: string, resolution: "release_to_creator" | "refund_to_brand" }
// Admin-only dispute resolution (spec §7 step 4): funds stay held until an
// admin manually resolves the case.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getCallerProfile } from "../_shared/supabaseClient.ts";
import { isRazorpayConfigured, payoutToLinkedAccount, refundPaymentLink } from "../_shared/razorpay.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.collaborationId || !body.resolution) {
      return jsonResponse({ error: "collaborationId and resolution are required" }, { status: 400 });
    }

    const caller = await getCallerProfile(req);
    if (!caller || caller.role !== "admin") {
      return jsonResponse({ error: "Only admins can resolve disputes." }, { status: 403 });
    }

    const supabase = getServiceClient();
    const { data: collab, error } = await supabase.from("collaborations").select("*").eq("id", body.collaborationId).single();
    if (error) throw error;

    if (collab.status !== "disputed") {
      return jsonResponse({ error: "This collaboration is not currently disputed." }, { status: 400 });
    }

    if (body.resolution === "release_to_creator") {
      const { data: creatorAccount } = await supabase
        .from("creator_profiles")
        .select("razorpay_linked_account_id")
        .eq("user_id", collab.creator_id)
        .single();

      let payout: "released" | "manual_queue" = "manual_queue";
      if (isRazorpayConfigured() && creatorAccount?.razorpay_linked_account_id && collab.escrow_amount) {
        await payoutToLinkedAccount({
          linkedAccountId: creatorAccount.razorpay_linked_account_id,
          amountInRupees: collab.escrow_amount,
          notes: { collaboration_id: collab.id, resolution: "dispute_release" },
        });
        payout = "released";
      }

      await supabase
        .from("collaborations")
        .update({
          status: "paid",
          escrow_status: payout === "released" ? "released" : "held",
          resolution_notes: `Dispute resolved by admin: released to creator (${payout}).`,
        })
        .eq("id", collab.id);

      return jsonResponse({ success: true, resolution: "release_to_creator", payout });
    }

    if (body.resolution === "refund_to_brand") {
      let refund: "refunded" | "manual_queue" = "manual_queue";
      if (isRazorpayConfigured() && collab.escrow_payment_id) {
        try {
          await refundPaymentLink(collab.escrow_payment_id, collab.escrow_amount ?? undefined);
          refund = "refunded";
        } catch {
          refund = "manual_queue";
        }
      }

      await supabase
        .from("collaborations")
        .update({
          status: "cancelled",
          escrow_status: refund === "refunded" ? "refunded" : "held",
        })
        .eq("id", collab.id);

      return jsonResponse({ success: true, resolution: "refund_to_brand", refund });
    }

    return jsonResponse({ error: "Unknown resolution type" }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
