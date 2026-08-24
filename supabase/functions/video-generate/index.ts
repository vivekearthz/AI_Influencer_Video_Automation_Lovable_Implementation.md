// POST /functions/v1/video-generate  { campaignId: string }
// Kicks off Veo generation for every scene in the script (spec §21, §24-25).
// Generation is long-running — this function only starts the job(s); poll
// with /video-status to finalize them once the provider reports completion.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob, failJob } from "../_shared/jobLifecycle.ts";
import { selectProviderForCapability, getDefaultModel } from "../_shared/providerRegistry.ts";
import { generateVideo, estimateVeoCost } from "../_shared/ai/veo.ts";
import { checkBudget } from "../_shared/costController.ts";
import { getAutomationSettings } from "../_shared/costController.ts";
import { qualityProfileResolution } from "../_shared/qualityProfile.ts";
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

    const settings = await getAutomationSettings(campaign.workspace_id);
    if (settings?.video_generation_paused) {
      return jsonResponse({ error: "Video generation is paused for this workspace (Emergency Controls)." }, { status: 423 });
    }

    const supabase = getServiceClient();
    const { data: scriptAsset } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "script")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scriptAsset) return jsonResponse({ error: "Generate the script before generating video." }, { status: 400 });

    const { data: presenterAsset } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "presenter_image")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const scenes = (scriptAsset.metadata as any)?.scenes?.length
      ? (scriptAsset.metadata as any).scenes
      : [{ scene: 1, duration: Math.min(campaign.duration_seconds, 8), visual: scriptAsset.metadata?.hook ?? campaign.name, dialogue: scriptAsset.metadata?.spoken_script ?? "" }];

    const provider = await selectProviderForCapability("video");
    const resolution = qualityProfileResolution(campaign.quality_profile);
    const model = await getDefaultModel(provider.id, "video");
    if (!model) throw new Error("No video model configured for the selected provider");

    const estimatedTotalCost = scenes.reduce(
      (sum: number, s: any) => sum + estimateVeoCost(model.model_key, resolution, Math.min(s.duration ?? 8, 8)),
      0
    );

    const budget = await checkBudget(campaign.workspace_id, estimatedTotalCost);
    if (budget.blocked) {
      await updateCampaignStatus(campaign.id, "qc_failed");
      return jsonResponse({ error: budget.reason, needsApproval: true }, { status: 402 });
    }

    await updateCampaignStatus(campaign.id, "generating");

    const results = [];
    for (const [index, scene] of scenes.entries()) {
      const sceneDuration = Math.min(scene.duration ?? 8, 8);
      const { job, alreadyCompleted, alreadyRunning } = await startJob({
        workspaceId: campaign.workspace_id,
        campaignId: campaign.id,
        jobType: "video",
        provider: provider.provider_key,
        model: model.model_key,
        idempotencySuffix: `scene-${index}`,
        requestPayload: { scene },
      });

      if (alreadyCompleted || alreadyRunning) {
        results.push({ scene: index, status: job.status, jobId: job.id });
        continue;
      }

      try {
        const operation = await generateVideo({
          modelKey: model.model_key,
          prompt: `${scene.visual}. Dialogue: "${scene.dialogue}"`,
          aspectRatio: campaign.aspect_ratio,
          resolution,
          durationSeconds: sceneDuration,
          generateAudio: true,
          referenceImageUrl: presenterAsset?.public_url ?? undefined,
        });

        await supabase
          .from("ai_generation_jobs")
          .update({ external_job_id: operation.operationName, status: "processing" })
          .eq("id", job.id);

        results.push({ scene: index, status: "processing", jobId: job.id, operationName: operation.operationName });
      } catch (genError) {
        await failJob(job.id, genError instanceof Error ? genError.message : String(genError), { needsReview: true });
        results.push({ scene: index, status: "failed", jobId: job.id, error: String(genError) });
      }
    }

    await writeAuditLog({ workspaceId: campaign.workspace_id, action: "video_generation_started", resourceType: "campaign", resourceId: campaign.id, metadata: { scenes: scenes.length } });

    return jsonResponse({ success: true, status: "processing", scenes: results, estimatedTotalCost });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
