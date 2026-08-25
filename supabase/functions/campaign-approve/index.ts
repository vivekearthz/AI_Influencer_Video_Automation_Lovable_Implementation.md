// POST /functions/v1/campaign-approve  { campaignId: string }
// "Approve & Schedule All" (spec §59): fans the finished campaign out into
// draft WhatsApp/email/social publish jobs, ready for social-publish /
// whatsapp-send / email-send to execute.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient, getUserClient } from "../_shared/supabaseClient.ts";
import { buildIdempotencyKey } from "../_shared/idempotency.ts";
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

    const { data: finalVideo } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "final_video")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!finalVideo?.public_url) {
      return jsonResponse({ error: "No final rendered video available yet." }, { status: 400 });
    }

    const { data: captionAsset } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "caption")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const captions = (captionAsset?.metadata as Record<string, any>) ?? {};

    let accounts;
    if (campaign.publish_to_all_connected) {
      const { data } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("workspace_id", campaign.workspace_id)
        .eq("status", "connected");
      accounts = data ?? [];
    } else {
      const { data } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("workspace_id", campaign.workspace_id)
        .in("platform_key", campaign.target_channel_keys.length ? campaign.target_channel_keys : ["__none__"]);
      accounts = data ?? [];
    }

    const { data: platformCatalog } = await supabase.from("platform_catalog").select("*");
    const catalogByKey = new Map((platformCatalog ?? []).map((p) => [p.platform_key, p]));

    const publishJobs = [];
    for (const account of accounts) {
      const catalogEntry = catalogByKey.get(account.platform_key);
      const publisherType = catalogEntry?.publisher_tier ?? "manual";
      const platformCaption = captions[account.platform_key];
      const caption =
        typeof platformCaption === "object" && platformCaption?.caption
          ? platformCaption.caption
          : captions.spoken_script ?? campaign.cta ?? campaign.name;
      const hashtags = typeof platformCaption === "object" ? platformCaption.hashtags ?? [] : [];

      const idempotencyKey = buildIdempotencyKey(campaign.id, account.id, finalVideo.id);
      const { data: job, error } = await supabase
        .from("social_publish_jobs")
        .upsert(
          {
            workspace_id: campaign.workspace_id,
            campaign_id: campaign.id,
            asset_id: finalVideo.id,
            social_account_id: account.id,
            publisher_type: publisherType,
            idempotency_key: idempotencyKey,
            status: "ready",
            caption,
            hashtags,
            scheduled_at: campaign.scheduled_at,
          },
          { onConflict: "idempotency_key" }
        )
        .select("*")
        .single();
      if (error) throw error;
      publishJobs.push(job);
    }

    if (campaign.whatsapp_enabled) {
      await supabase.from("whatsapp_campaigns").insert({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign.id,
        media_url: finalVideo.public_url,
        template_name: "campaign_video_update",
        language: campaign.language === "English" ? "en" : campaign.language.toLowerCase(),
        status: "draft",
      });
    }

    if (campaign.email_enabled) {
      const { data: emailAsset } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("asset_type", "email_html")
        .maybeSingle();

      await supabase.from("email_campaigns").insert({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign.id,
        subject: campaign.name,
        html_asset_id: emailAsset?.id ?? null,
        status: "draft",
      });
    }

    const userClient = getUserClient(req);
    const { data: userRes } = await userClient.auth.getUser();

    await updateCampaignStatus(campaign.id, campaign.scheduled_at ? "scheduled" : "approved", {
      approved_at: new Date().toISOString(),
      approved_by: userRes.user?.id,
    });

    await writeAuditLog({
      workspaceId: campaign.workspace_id,
      userId: userRes.user?.id,
      action: "campaign_approved",
      resourceType: "campaign",
      resourceId: campaign.id,
      metadata: { channelCount: publishJobs.length },
    });

    return jsonResponse({ success: true, publishJobs: publishJobs.length });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
