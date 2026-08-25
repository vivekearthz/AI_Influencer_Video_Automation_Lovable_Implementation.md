// GET /functions/v1/campaign-status?campaignId=...
// Aggregated status payload for the campaign status page (spec §39, §47, §59).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "GET") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    if (!campaignId) return jsonResponse({ error: "campaignId is required" }, { status: 400 });

    const campaign = await getCampaignForCaller(req, campaignId);
    if (!campaign) return jsonResponse({ error: "Campaign not found or access denied" }, { status: 404 });

    const supabase = getServiceClient();
    const [{ data: jobs }, { data: assets }, { data: publishJobs }, { data: whatsapp }, { data: email }, { data: costs }] =
      await Promise.all([
        supabase.from("ai_generation_jobs").select("*").eq("campaign_id", campaignId).order("created_at"),
        supabase.from("campaign_assets").select("*").eq("campaign_id", campaignId).order("created_at"),
        supabase.from("social_publish_jobs").select("*, social_accounts(platform_key, account_name)").eq("campaign_id", campaignId),
        supabase.from("whatsapp_campaigns").select("*").eq("campaign_id", campaignId),
        supabase.from("email_campaigns").select("*").eq("campaign_id", campaignId),
        supabase.from("ai_cost_ledger").select("*").eq("campaign_id", campaignId),
      ]);

    const totalCost = (costs ?? []).reduce((sum, c) => sum + (c.actual_cost ?? c.estimated_cost ?? 0), 0);
    const errors = (jobs ?? []).filter((j) => j.status === "failed" || j.status === "needs_review").map((j) => ({
      jobType: j.job_type,
      error: j.error_message,
    }));

    return jsonResponse({
      campaign,
      jobs,
      assets,
      publishing: publishJobs,
      whatsapp,
      email,
      cost: totalCost,
      errors,
    });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
