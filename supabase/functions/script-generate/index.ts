// POST /functions/v1/script-generate  { campaignId: string }
// Generates the campaign script via the configured text provider (spec §18-19, §44).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob, completeJob, failJob } from "../_shared/jobLifecycle.ts";
import { selectProviderForCapability, getDefaultModel } from "../_shared/providerRegistry.ts";
import { generateCampaignScript } from "../_shared/ai/gemini.ts";
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

    const provider = await selectProviderForCapability("text").catch((err) => {
      throw new Error(err.message);
    });
    const model = await getDefaultModel(provider.id, "text");
    if (!model) throw new Error("No text model configured for the selected provider");

    const { job, alreadyCompleted, alreadyRunning } = await startJob({
      workspaceId: campaign.workspace_id,
      campaignId: campaign.id,
      jobType: "script",
      provider: provider.provider_key,
      model: model.model_key,
      requestPayload: { productName: campaign.product_name, targetAudience: campaign.target_audience },
    });

    if (alreadyCompleted) {
      return jsonResponse({ success: true, status: "completed", cached: true });
    }
    if (alreadyRunning) {
      return jsonResponse({ success: true, status: "processing", cached: true });
    }

    await updateCampaignStatus(campaign.id, "script_pending");

    try {
      const script = await generateCampaignScript({
        modelKey: model.model_key,
        productName: campaign.product_name ?? campaign.name,
        productDescription: campaign.product_description ?? undefined,
        targetAudience: campaign.target_audience ?? "general audience",
        language: campaign.language,
        durationSeconds: campaign.duration_seconds,
        style: campaign.style ?? undefined,
        cta: campaign.cta ?? undefined,
        tone: campaign.tone,
      });

      const supabase = getServiceClient();
      await supabase.from("campaign_assets").insert({
        campaign_id: campaign.id,
        asset_type: "script",
        metadata: script,
        provider: provider.provider_key,
        status: "ready",
      });

      await completeJob(job.id, { responsePayload: script as unknown as Record<string, unknown> });
      await updateCampaignStatus(campaign.id, "script_ready");
      await writeAuditLog({
        workspaceId: campaign.workspace_id,
        action: "script_generated",
        resourceType: "campaign",
        resourceId: campaign.id,
      });

      return jsonResponse({ success: true, status: "completed", script });
    } catch (genError: any) {
      await failJob(job.id, genError?.message ?? "Script generation failed");
      await updateCampaignStatus(campaign.id, "failed");
      throw genError;
    }
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
