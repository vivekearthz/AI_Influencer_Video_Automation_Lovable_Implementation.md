// POST /functions/v1/caption-generate  { campaignId: string }
// Platform-specific caption variants (spec §28-29).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { startJob, completeJob, failJob } from "../_shared/jobLifecycle.ts";
import { selectProviderForCapability, getDefaultModel } from "../_shared/providerRegistry.ts";
import { generatePlatformCaptions } from "../_shared/ai/gemini.ts";
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
    const { data: scriptAsset } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "script")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!scriptAsset) return jsonResponse({ error: "Generate the script before generating captions." }, { status: 400 });

    let platforms: string[] = body.platforms;
    if (!platforms?.length) {
      if (campaign.publish_to_all_connected) {
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("platform_key")
          .eq("workspace_id", campaign.workspace_id)
          .eq("status", "connected");
        platforms = (accounts ?? []).map((a) => a.platform_key);
      } else {
        platforms = campaign.target_channel_keys;
      }
    }
    if (!platforms.length) platforms = ["linkedin", "instagram", "facebook", "youtube"];

    const provider = await selectProviderForCapability("text");
    const model = await getDefaultModel(provider.id, "text");
    if (!model) throw new Error("No text model configured for captions");

    const { job, alreadyCompleted } = await startJob({
      workspaceId: campaign.workspace_id,
      campaignId: campaign.id,
      jobType: "caption",
      provider: provider.provider_key,
      model: model.model_key,
    });

    if (alreadyCompleted) return jsonResponse({ success: true, status: "completed", cached: true });

    try {
      const scriptMeta = scriptAsset.metadata as any;
      const captions = await generatePlatformCaptions({
        modelKey: model.model_key,
        spokenScript: scriptMeta.spoken_script ?? "",
        hook: scriptMeta.hook ?? "",
        cta: campaign.cta ?? scriptMeta.cta ?? "",
        platforms,
        language: campaign.language,
      });

      await supabase.from("campaign_assets").insert({
        campaign_id: campaign.id,
        asset_type: "caption",
        metadata: captions as unknown as Record<string, unknown>,
        provider: provider.provider_key,
        status: "ready",
      });

      await completeJob(job.id, { responsePayload: captions as unknown as Record<string, unknown> });
      await writeAuditLog({ workspaceId: campaign.workspace_id, action: "captions_generated", resourceType: "campaign", resourceId: campaign.id });

      return jsonResponse({ success: true, status: "completed", captions });
    } catch (capError) {
      await failJob(job.id, capError instanceof Error ? capError.message : String(capError));
      throw capError;
    }
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
