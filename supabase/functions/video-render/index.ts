// POST /functions/v1/video-render  { campaignId: string }
// Queues a render job for the FFmpeg worker (spec §25-27). Supabase Edge
// Functions cannot shell out to ffmpeg, so this function only enqueues the
// job — the actual brand-overlay/subtitle burn-in happens in
// workers/render-worker, which polls `ai_generation_jobs` for job_type='render'.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob } from "../_shared/jobLifecycle.ts";
import { writeAuditLog } from "../_shared/audit.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.campaignId) return jsonResponse({ error: "campaignId is required" }, { status: 400 });

    const campaign = await getCampaignForCaller(req, body.campaignId);
    if (!campaign) return jsonResponse({ error: "Campaign not found or access denied" }, { status: 404 });

    const supabase = getServiceClient();
    const { data: rawScenes, error } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "raw_video")
      .order("scene_index", { ascending: true });
    if (error) throw error;

    if (!rawScenes?.length) {
      return jsonResponse({ error: "No raw video scenes available yet — run video-generate and video-status first." }, { status: 400 });
    }

    let brandTemplate = null;
    if (campaign.brand_template_id) {
      const { data } = await supabase.from("brand_templates").select("*").eq("id", campaign.brand_template_id).maybeSingle();
      brandTemplate = data;
    }

    const { job, alreadyCompleted, alreadyRunning } = await startJob({
      workspaceId: campaign.workspace_id,
      campaignId: campaign.id,
      jobType: "render",
      requestPayload: {
        sceneAssetIds: rawScenes.map((s) => s.id),
        sceneAssetUrls: rawScenes.map((s) => s.public_url),
        brandTemplate,
        cta: campaign.cta,
        landingUrl: campaign.landing_url,
        aspectRatio: campaign.aspect_ratio,
      },
    });

    if (alreadyCompleted) return jsonResponse({ success: true, status: "completed", cached: true });
    if (alreadyRunning) return jsonResponse({ success: true, status: "queued", cached: true });

    // Job stays "processing" (set by startJob) until the render-worker calls
    // back via /webhooks-ai with the finished asset, or picks it up by
    // polling status='processing' + job_type='render' directly.
    await supabase.from("ai_generation_jobs").update({ status: "queued" }).eq("id", job.id);
    await updateCampaignStatus(campaign.id, "rendering");
    await writeAuditLog({ workspaceId: campaign.workspace_id, action: "render_queued", resourceType: "campaign", resourceId: campaign.id });

    return jsonResponse({ success: true, status: "queued", jobId: job.id });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
