// POST /functions/v1/video-qc  { campaignId: string }
// AI quality-control gate before publishing (spec §37-38).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob, completeJob, failJob } from "../_shared/jobLifecycle.ts";
import { selectProviderForCapability, getDefaultModel } from "../_shared/providerRegistry.ts";
import { runQualityControl } from "../_shared/ai/gemini.ts";
import { writeAuditLog } from "../_shared/audit.ts";

const MANDATORY_REVIEW_CATEGORIES = new Set([
  "financial guarantee",
  "medical claim",
  "legal guarantee",
  "government affiliation claim",
  "celebrity likeness",
  "unverified testimonial",
  "unverified property claim",
]);

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
    const { data: scriptAsset } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "script")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!scriptAsset) return jsonResponse({ error: "No script found to review." }, { status: 400 });

    const { data: finalVideo } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "final_video")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = await selectProviderForCapability("text");
    const model = await getDefaultModel(provider.id, "text");
    if (!model) throw new Error("No text model configured for QC");

    const { job, alreadyCompleted } = await startJob({
      workspaceId: campaign.workspace_id,
      campaignId: campaign.id,
      jobType: "qc",
      provider: provider.provider_key,
      model: model.model_key,
    });

    if (alreadyCompleted) return jsonResponse({ success: true, status: "completed", cached: true });

    try {
      const qc = await runQualityControl({
        modelKey: model.model_key,
        script: scriptAsset.metadata as any,
        cta: campaign.cta ?? undefined,
        landingUrl: campaign.landing_url ?? undefined,
      });

      const hasMandatoryFlag = qc.flagged_categories?.some((c) => MANDATORY_REVIEW_CATEGORIES.has(c.toLowerCase()));
      const missingFinalVideo = !finalVideo?.public_url;
      const requiresReview = qc.requires_human_review || hasMandatoryFlag || missingFinalVideo;

      await completeJob(job.id, { responsePayload: qc as unknown as Record<string, unknown> });
      await updateCampaignStatus(campaign.id, requiresReview ? "qc_failed" : "ready_for_review");
      await writeAuditLog({
        workspaceId: campaign.workspace_id,
        action: requiresReview ? "video_rejected" : "video_approved",
        resourceType: "campaign",
        resourceId: campaign.id,
        metadata: { score: qc.score, issues: qc.issues },
      });

      return jsonResponse({ success: true, status: "completed", qc, requiresHumanReview: requiresReview });
    } catch (qcError) {
      await failJob(job.id, qcError instanceof Error ? qcError.message : String(qcError));
      throw qcError;
    }
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
