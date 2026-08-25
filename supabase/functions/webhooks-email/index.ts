// POST /functions/v1/webhooks-email
// Transactional email provider delivery/bounce/open/click webhook (spec §17, §34).
// Shaped for Resend-style events; adjust the payload mapping if you swap providers.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { verifyHmacSignature } from "../_shared/webhookSignature.ts";

const EVENT_FIELD_MAP: Record<string, string> = {
  "email.delivered": "delivered_count",
  "email.opened": "opened_count",
  "email.clicked": "clicked_count",
  "email.bounced": "bounced_count",
};

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });

    const rawBody = await req.text();
    const signature = req.headers.get("X-Webhook-Signature");
    const signingSecret = Deno.env.get("WEBHOOK_SIGNING_SECRET");
    if (signingSecret) {
      const valid = await verifyHmacSignature(rawBody, signature, signingSecret);
      if (!valid) return jsonResponse({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const externalCampaignId = payload.data?.email_id ?? payload.data?.broadcast_id;
    const field = EVENT_FIELD_MAP[payload.type];

    if (externalCampaignId && field) {
      const supabase = getServiceClient();
      const { data: campaign } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("external_campaign_id", externalCampaignId)
        .maybeSingle();

      if (campaign) {
        const { data: current } = await supabase.from("email_campaigns").select(field).eq("id", campaign.id).single();
        const currentValue = (current as any)?.[field] ?? 0;
        await supabase.from("email_campaigns").update({ [field]: currentValue + 1 }).eq("id", campaign.id);
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
