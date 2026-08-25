// POST /functions/v1/whatsapp-send  { campaignId: string, whatsappCampaignId?: string }
// Sends the draft WhatsApp campaign via the official Cloud API (spec §16).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { getAutomationSettings } from "../_shared/costController.ts";
import { sendWhatsAppTemplate, isWhatsAppConfigured } from "../_shared/messaging/whatsapp.ts";
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
    if (settings?.whatsapp_paused) {
      return jsonResponse({ error: "WhatsApp sending is paused for this workspace (Emergency Controls)." }, { status: 423 });
    }

    if (!isWhatsAppConfigured()) {
      return jsonResponse({ error: "WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID." }, { status: 424 });
    }

    const supabase = getServiceClient();
    let query = supabase.from("whatsapp_campaigns").select("*").eq("campaign_id", campaign.id);
    if (body.whatsappCampaignId) query = query.eq("id", body.whatsappCampaignId);
    const { data: whatsappCampaigns, error } = await query;
    if (error) throw error;

    const summary = { sent: 0, failed: 0 };

    for (const wc of whatsappCampaigns ?? []) {
      await supabase.from("whatsapp_campaigns").update({ status: "sending" }).eq("id", wc.id);

      const phoneList: string[] = (wc.phone_list as string[]) ?? [];
      let sent = 0;
      let failed = 0;
      for (const phone of phoneList) {
        const result = await sendWhatsAppTemplate({
          to: phone,
          templateName: wc.template_name ?? "campaign_video_update",
          language: wc.language ?? "en",
          mediaUrl: wc.media_url ?? undefined,
        });
        if (result.success) sent += 1;
        else failed += 1;
      }

      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partially_failed",
          sent_count: sent,
          failed_count: failed,
        })
        .eq("id", wc.id);

      summary.sent += sent;
      summary.failed += failed;
    }

    await writeAuditLog({ workspaceId: campaign.workspace_id, action: "whatsapp_sent", resourceType: "campaign", resourceId: campaign.id, metadata: summary });

    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
