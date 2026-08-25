// POST /functions/v1/webhooks-social
// Generic inbound webhook for social publishers that support async status
// callbacks (e.g. TikTok publish completion, approved third-party
// publishers). Body shape: { provider, externalPostId, status, url? } (spec §34).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { verifyHmacSignature } from "../_shared/webhookSignature.ts";

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
    if (!payload.externalPostId) return jsonResponse({ error: "externalPostId is required" }, { status: 400 });

    const supabase = getServiceClient();
    const { data: job, error } = await supabase
      .from("social_publish_jobs")
      .select("*")
      .eq("external_post_id", payload.externalPostId)
      .maybeSingle();
    if (error) throw error;
    if (!job) return jsonResponse({ error: "No matching publish job found" }, { status: 404 });

    const statusMap: Record<string, string> = {
      completed: "published",
      published: "published",
      failed: "failed",
      processing: "processing",
    };
    const nextStatus = statusMap[payload.status] ?? job.status;

    await supabase
      .from("social_publish_jobs")
      .update({
        status: nextStatus,
        external_url: payload.url ?? job.external_url,
        published_at: nextStatus === "published" ? new Date().toISOString() : job.published_at,
        error_message: payload.error ?? job.error_message,
        response_payload: payload,
      })
      .eq("id", job.id);

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
