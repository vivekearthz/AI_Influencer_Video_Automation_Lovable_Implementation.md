// POST /functions/v1/presenter-generate  { campaignId: string }
// Generates (or reuses) a presenter reference image (spec §20, §41, §68).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob, completeJob, failJob } from "../_shared/jobLifecycle.ts";
import { selectProviderForCapability, getDefaultModel } from "../_shared/providerRegistry.ts";
import { generateImage } from "../_shared/ai/gemini.ts";
import { recordCost, writeAuditLog } from "../_shared/audit.ts";

const DEFAULT_PRESENTER_PROMPT = `Photorealistic portrait of an Indian presenter, 25-32 years old, professional and
approachable, natural skin texture, realistic hair, subtle makeup, neutral premium background, direct eye contact,
medium close-up, 9:16 composition. No text, no watermark, no logo.`;

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

    // If the campaign already references a presenter with a reference image, reuse it.
    if (campaign.presenter_id) {
      const { data: presenter } = await supabase
        .from("presenters")
        .select("*")
        .eq("id", campaign.presenter_id)
        .maybeSingle();
      if (presenter?.reference_image_url) {
        await supabase.from("campaign_assets").insert({
          campaign_id: campaign.id,
          asset_type: "presenter_image",
          public_url: presenter.reference_image_url,
          status: "ready",
          metadata: { reused_presenter_id: presenter.id },
        });
        return jsonResponse({ success: true, status: "completed", reused: true, imageUrl: presenter.reference_image_url });
      }
    }

    const provider = await selectProviderForCapability("image");
    const model = await getDefaultModel(provider.id, "image");
    if (!model) throw new Error("No image model configured for the selected provider");

    const { job, alreadyCompleted, alreadyRunning } = await startJob({
      workspaceId: campaign.workspace_id,
      campaignId: campaign.id,
      jobType: "presenter_image",
      provider: provider.provider_key,
      model: model.model_key,
    });

    if (alreadyCompleted) return jsonResponse({ success: true, status: "completed", cached: true });
    if (alreadyRunning) return jsonResponse({ success: true, status: "processing", cached: true });

    try {
      const prompt = body.customPrompt || DEFAULT_PRESENTER_PROMPT;
      const imageBytes = await generateImage({ modelKey: model.model_key, prompt, aspectRatio: campaign.aspect_ratio });

      const storagePath = `${campaign.workspace_id}/${campaign.id}/presenter-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from("presenters").upload(storagePath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("presenters").getPublicUrl(storagePath);
      const publicUrl = publicUrlData.publicUrl;

      await supabase.from("campaign_assets").insert({
        campaign_id: campaign.id,
        asset_type: "presenter_image",
        storage_path: storagePath,
        public_url: publicUrl,
        provider: provider.provider_key,
        provider_job_id: job.id,
        status: "ready",
      });

      const cost = model.cost_per_unit ?? 0;
      await completeJob(job.id, { responsePayload: { publicUrl }, actualCost: cost });
      await recordCost({
        workspaceId: campaign.workspace_id,
        campaignId: campaign.id,
        jobId: job.id,
        provider: provider.provider_key,
        model: model.model_key,
        operation: "presenter_image",
        units: 1,
        unitType: "image",
        actualCost: cost,
      });
      await writeAuditLog({ workspaceId: campaign.workspace_id, action: "presenter_generated", resourceType: "campaign", resourceId: campaign.id });

      return jsonResponse({ success: true, status: "completed", imageUrl: publicUrl });
    } catch (genError) {
      await failJob(job.id, genError instanceof Error ? genError.message : String(genError));
      throw genError;
    }
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
