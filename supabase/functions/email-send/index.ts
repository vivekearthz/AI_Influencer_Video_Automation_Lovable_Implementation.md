// POST /functions/v1/email-send  { campaignId: string, emailCampaignId?: string }
// Sends the draft email campaign via the configured transactional provider (spec §17).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { getAutomationSettings } from "../_shared/costController.ts";
import { sendEmailCampaign, isEmailConfigured } from "../_shared/messaging/email.ts";
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
    if (settings?.email_paused) {
      return jsonResponse({ error: "Email sending is paused for this workspace (Emergency Controls)." }, { status: 423 });
    }

    if (!isEmailConfigured()) {
      return jsonResponse({ error: "Email provider is not configured. Set EMAIL_PROVIDER_KEY and EMAIL_FROM_ADDRESS." }, { status: 424 });
    }

    const supabase = getServiceClient();
    let query = supabase.from("email_campaigns").select("*").eq("campaign_id", campaign.id);
    if (body.emailCampaignId) query = query.eq("id", body.emailCampaignId);
    const { data: emailCampaigns, error } = await query;
    if (error) throw error;

    const { data: finalVideo } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "final_video")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summary = { sent: 0, failed: 0 };

    for (const ec of emailCampaigns ?? []) {
      await supabase.from("email_campaigns").update({ status: "sending" }).eq("id", ec.id);

      const recipients: string[] = (ec.recipient_list as string[]) ?? [];
      const html = `<p>${campaign.cta ?? campaign.name}</p>${finalVideo?.public_url ? `<p><a href="${finalVideo.public_url}">Watch the video</a></p>` : ""}${campaign.landing_url ? `<p><a href="${campaign.landing_url}">${campaign.landing_url}</a></p>` : ""}`;

      const result = await sendEmailCampaign({
        recipients,
        subject: ec.subject ?? campaign.name,
        html,
      });

      await supabase
        .from("email_campaigns")
        .update({
          status: result.success ? "sent" : "failed",
          sent_count: result.success ? recipients.length : 0,
          error_message: result.error,
          external_campaign_id: result.externalId,
        })
        .eq("id", ec.id);

      if (result.success) summary.sent += recipients.length;
      else summary.failed += recipients.length;
    }

    await writeAuditLog({ workspaceId: campaign.workspace_id, action: "email_sent", resourceType: "campaign", resourceId: campaign.id, metadata: summary });

    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
