// POST /functions/v1/webhooks-ai
// Generic inbound webhook for AI providers that support async completion
// callbacks (e.g. future avatar/lip-sync providers). Body shape:
// { externalJobId, status, videoUrl?, error? } (spec §34).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { verifyHmacSignature } from "../_shared/webhookSignature.ts";
import { completeJob, failJob } from "../_shared/jobLifecycle.ts";

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
    if (!payload.externalJobId) return jsonResponse({ error: "externalJobId is required" }, { status: 400 });

    const supabase = getServiceClient();
    const { data: job, error } = await supabase
      .from("ai_generation_jobs")
      .select("*")
      .eq("external_job_id", payload.externalJobId)
      .maybeSingle();
    if (error) throw error;
    if (!job) return jsonResponse({ error: "No matching generation job found" }, { status: 404 });

    if (payload.status === "completed") {
      await completeJob(job.id, { responsePayload: payload });
    } else if (payload.status === "failed") {
      await failJob(job.id, payload.error ?? "Provider reported failure", { needsReview: true });
    } else {
      await supabase.from("ai_generation_jobs").update({ status: "processing", response_payload: payload }).eq("id", job.id);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
