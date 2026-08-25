// POST /functions/v1/video-status  { campaignId: string }
// Polls any in-flight Veo operations for a campaign and finalizes completed
// ones by downloading the raw video into Supabase Storage (spec §21, §24).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { completeJob, failJob } from "../_shared/jobLifecycle.ts";
import { getVideoStatus, estimateVeoCost } from "../_shared/ai/veo.ts";
import { qualityProfileResolution, qualityProfileMaxRetries } from "../_shared/qualityProfile.ts";
import { recordCost } from "../_shared/audit.ts";

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
    const { data: jobs, error } = await supabase
      .from("ai_generation_jobs")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("job_type", "video")
      .in("status", ["processing", "retrying"]);
    if (error) throw error;

    const resolution = qualityProfileResolution(campaign.quality_profile);
    const maxRetries = qualityProfileMaxRetries(campaign.quality_profile);
    const results = [];

    for (const job of jobs ?? []) {
      if (!job.external_job_id) continue;

      try {
        const operation = await getVideoStatus(job.external_job_id);

        if (operation.error) {
          if (job.attempt < maxRetries) {
            await supabase.from("ai_generation_jobs").update({ status: "retrying" }).eq("id", job.id);
            results.push({ jobId: job.id, status: "retrying" });
          } else {
            await failJob(job.id, operation.error, { needsReview: true });
            results.push({ jobId: job.id, status: "needs_review", error: operation.error });
          }
          continue;
        }

        if (!operation.done || !operation.videoUri) {
          results.push({ jobId: job.id, status: "processing" });
          continue;
        }

        const videoRes = await fetch(operation.videoUri);
        const videoBuffer = new Uint8Array(await videoRes.arrayBuffer());
        const sceneIndex = (job.request_payload as any)?.scene?.scene ?? 0;
        const storagePath = `${campaign.workspace_id}/${campaign.id}/raw-scene-${sceneIndex}-${Date.now()}.mp4`;

        const { error: uploadError } = await supabase.storage.from("raw-video").upload(storagePath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("raw-video").getPublicUrl(storagePath);

        await supabase.from("campaign_assets").insert({
          campaign_id: campaign.id,
          asset_type: "raw_video",
          scene_index: sceneIndex,
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
          provider: job.provider,
          provider_job_id: job.external_job_id,
          status: "ready",
        });

        const duration = (job.request_payload as any)?.scene?.duration ?? 8;
        const cost = estimateVeoCost(job.model ?? "veo-3.1-lite-generate-preview", resolution, Math.min(duration, 8));

        await completeJob(job.id, { responsePayload: { videoUrl: publicUrlData.publicUrl }, actualCost: cost });
        await recordCost({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          jobId: job.id,
          provider: job.provider ?? "veo",
          model: job.model,
          operation: "video",
          units: Math.min(duration, 8),
          unitType: "second",
          actualCost: cost,
        });

        results.push({ jobId: job.id, status: "completed", videoUrl: publicUrlData.publicUrl });
      } catch (pollError) {
        results.push({ jobId: job.id, status: "error", error: String(pollError) });
      }
    }

    const { data: remainingJobs } = await supabase
      .from("ai_generation_jobs")
      .select("id, status")
      .eq("campaign_id", campaign.id)
      .eq("job_type", "video");

    const allDone = (remainingJobs ?? []).every((j) => ["completed", "failed", "needs_review", "cancelled"].includes(j.status));
    if (allDone && (remainingJobs ?? []).length > 0) {
      const anyFailed = (remainingJobs ?? []).some((j) => j.status === "failed" || j.status === "needs_review");
      await updateCampaignStatus(campaign.id, anyFailed ? "qc_failed" : "rendering");
    }

    return jsonResponse({ success: true, results, allDone });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
