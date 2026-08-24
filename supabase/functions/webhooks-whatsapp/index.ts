// GET/POST /functions/v1/webhooks-whatsapp
// WhatsApp Cloud API webhook: verification handshake (GET) + delivery
// status callbacks (POST) (spec §16, §34).
import { handleOptions, jsonResponse, corsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { verifyHmacSignature } from "../_shared/webhookSignature.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token && expected && token === expected) {
      return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-Hub-Signature-256");
    const appSecret = Deno.env.get("META_APP_SECRET");

    if (appSecret) {
      const valid = await verifyHmacSignature(rawBody, signature, appSecret);
      if (!valid) return jsonResponse({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const supabase = getServiceClient();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const statuses = change.value?.statuses ?? [];
        for (const statusUpdate of statuses) {
          const messageId = statusUpdate.id;
          const status = statusUpdate.status; // sent | delivered | read | failed

          const { data: campaigns } = await supabase
            .from("whatsapp_campaigns")
            .select("id, delivered_count, read_count, failed_count")
            .contains("phone_list", JSON.stringify([statusUpdate.recipient_id]))
            .limit(1);

          const campaignRow = campaigns?.[0];
          if (!campaignRow) continue;

          const increment: Record<string, number> = {};
          if (status === "delivered") increment.delivered_count = (campaignRow.delivered_count ?? 0) + 1;
          if (status === "read") increment.read_count = (campaignRow.read_count ?? 0) + 1;
          if (status === "failed") increment.failed_count = (campaignRow.failed_count ?? 0) + 1;

          if (Object.keys(increment).length) {
            await supabase.from("whatsapp_campaigns").update(increment).eq("id", campaignRow.id);
          }

          console.log(`[webhooks-whatsapp] message ${messageId} -> ${status}`);
        }
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
