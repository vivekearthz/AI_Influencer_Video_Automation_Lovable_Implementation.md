// POST /functions/v1/razorpay-webhook
// Handles Razorpay webhook events: escrow payment links being paid, and
// subscription lifecycle events (spec §7). Configure this URL + a webhook
// secret in the Razorpay dashboard, then set RAZORPAY_WEBHOOK_SECRET.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { verifyWebhookSignature } from "../_shared/razorpay.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const valid = await verifyWebhookSignature(rawBody, signature);
    if (!valid) return jsonResponse({ error: "Invalid webhook signature" }, { status: 401 });

    const payload = JSON.parse(rawBody);
    const supabase = getServiceClient();

    switch (payload.event) {
      case "payment_link.paid": {
        const paymentLinkId = payload.payload?.payment_link?.entity?.id;
        if (paymentLinkId) {
          await supabase
            .from("collaborations")
            .update({ escrow_status: "held" })
            .eq("escrow_payment_id", paymentLinkId);
        }
        break;
      }

      case "subscription.activated":
      case "subscription.charged": {
        const subscriptionId = payload.payload?.subscription?.entity?.id;
        if (subscriptionId) {
          await supabase
            .from("brand_profiles")
            .update({ subscription_status: "active" })
            .eq("razorpay_subscription_id", subscriptionId);
        }
        break;
      }

      case "subscription.pending":
      case "subscription.halted": {
        const subscriptionId = payload.payload?.subscription?.entity?.id;
        if (subscriptionId) {
          await supabase
            .from("brand_profiles")
            .update({ subscription_status: "past_due" })
            .eq("razorpay_subscription_id", subscriptionId);
        }
        break;
      }

      case "subscription.cancelled": {
        const subscriptionId = payload.payload?.subscription?.entity?.id;
        if (subscriptionId) {
          await supabase
            .from("brand_profiles")
            .update({ subscription_status: "cancelled" })
            .eq("razorpay_subscription_id", subscriptionId);
        }
        break;
      }

      default:
        break;
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
