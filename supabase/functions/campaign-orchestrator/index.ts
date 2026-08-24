// POST /functions/v1/campaign-orchestrator
// -----------------------------------------------------------------------------
// Automatic pipeline advancement (spec §32, §35: "the orchestrator should
// enqueue dependent jobs only after prerequisites complete rather than
// firing every job simultaneously"). Meant to be invoked on a schedule —
// see supabase/cron/schedule_orchestrator.sql (pg_cron, primary mechanism)
// and .github/workflows/campaign-orchestrator-cron.yml (GitHub Actions,
// alternative mechanism for plans/self-hosted setups without pg_cron/pg_net).
//
// Every existing per-step function (script-generate, video-generate, ...) is
// already idempotent, so this sweep can safely call them again on every run
// without duplicating work or cost. This function only ever *advances* a
// campaign along the happy path; QC failures, mandatory-human-review flags,
// and publish failures are left for a human to act on in the approval queue
// or campaign detail page (spec §38, §58) rather than being auto-retried
// forever.
// -----------------------------------------------------------------------------
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { isAuthorizedCronRequest } from "../_shared/cronGuard.ts";
import { invokeFunction } from "../_shared/internalInvoke.ts";
import { writeAuditLog } from "../_shared/audit.ts";

interface AutomationFlags {
  video_generation_paused: boolean;
  social_publishing_paused: boolean;
  whatsapp_paused: boolean;
  email_paused: boolean;
}

const MAX_CAMPAIGNS_PER_SWEEP = 25;

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  if (!isAuthorizedCronRequest(req)) {
    return jsonResponse({ error: "Unauthorized. Set X-Cron-Secret to match ORCHESTRATOR_CRON_SECRET." }, { status: 401 });
  }

  const supabase = getServiceClient();
  const actions: Array<{ campaignId: string; action: string; result?: string }> = [];

  try {
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .in("status", ["draft", "script_ready", "generating", "rendering", "qc_pending", "ready_for_review", "approved", "scheduled"])
      .order("updated_at", { ascending: true })
      .limit(MAX_CAMPAIGNS_PER_SWEEP);
    if (error) throw error;

    if (!campaigns?.length) {
      return jsonResponse({ success: true, processed: 0, actions: [] });
    }

    const workspaceIds = Array.from(new Set(campaigns.map((c) => c.workspace_id)));
    const { data: settingsRows } = await supabase
      .from("automation_settings")
      .select("workspace_id, video_generation_paused, social_publishing_paused, whatsapp_paused, email_paused")
      .in("workspace_id", workspaceIds);
    const settingsByWorkspace = new Map<string, AutomationFlags>((settingsRows ?? []).map((s) => [s.workspace_id, s]));

    for (const campaign of campaigns) {
      const flags = settingsByWorkspace.get(campaign.workspace_id);
      const now = Date.now();

      try {
        switch (campaign.status) {
          case "draft": {
            if (flags?.video_generation_paused) break;
            const { data: existingJob } = await supabase
              .from("ai_generation_jobs")
              .select("id, status")
              .eq("campaign_id", campaign.id)
              .eq("job_type", "script")
              .maybeSingle();
            if (existingJob?.status === "failed") break; // needs human retry, don't loop forever
            const { ok } = await invokeFunction("script-generate", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "script-generate", result: ok ? "ok" : "error" });
            break;
          }

          case "script_ready": {
            if (flags?.video_generation_paused) break;
            const { data: presenterJob } = await supabase
              .from("ai_generation_jobs")
              .select("id, status")
              .eq("campaign_id", campaign.id)
              .eq("job_type", "presenter_image")
              .maybeSingle();

            if (!presenterJob) {
              const { ok } = await invokeFunction("presenter-generate", { campaignId: campaign.id });
              actions.push({ campaignId: campaign.id, action: "presenter-generate", result: ok ? "ok" : "error" });
              break; // give the next sweep a chance to see the finished presenter image
            }

            if (presenterJob.status === "processing" || presenterJob.status === "queued") break;

            const { data: videoJob } = await supabase
              .from("ai_generation_jobs")
              .select("id")
              .eq("campaign_id", campaign.id)
              .eq("job_type", "video")
              .limit(1)
              .maybeSingle();
            if (videoJob) break; // already started, wait for status polling below

            const { ok } = await invokeFunction("video-generate", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "video-generate", result: ok ? "ok" : "error" });
            break;
          }

          case "generating": {
            const { ok } = await invokeFunction("video-status", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "video-status", result: ok ? "ok" : "error" });
            break;
          }

          case "rendering": {
            const { data: renderJob } = await supabase
              .from("ai_generation_jobs")
              .select("id, status")
              .eq("campaign_id", campaign.id)
              .eq("job_type", "render")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (renderJob && renderJob.status !== "failed") break; // worker is already handling it
            const { ok } = await invokeFunction("video-render", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "video-render", result: ok ? "ok" : "error" });
            break;
          }

          case "qc_pending": {
            const { ok } = await invokeFunction("video-qc", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "video-qc", result: ok ? "ok" : "error" });
            break;
          }

          case "ready_for_review": {
            const { data: captionAsset } = await supabase
              .from("campaign_assets")
              .select("id")
              .eq("campaign_id", campaign.id)
              .eq("asset_type", "caption")
              .limit(1)
              .maybeSingle();
            if (captionAsset) break; // fully prepped, waiting on human approval
            const { ok } = await invokeFunction("caption-generate", { campaignId: campaign.id });
            actions.push({ campaignId: campaign.id, action: "caption-generate", result: ok ? "ok" : "error" });
            break;
          }

          case "approved":
          case "scheduled": {
            const dueNow = !campaign.scheduled_at || new Date(campaign.scheduled_at).getTime() <= now;
            if (!dueNow) break;

            if (!flags?.social_publishing_paused) {
              const { ok } = await invokeFunction("social-publish", { campaignId: campaign.id });
              actions.push({ campaignId: campaign.id, action: "social-publish", result: ok ? "ok" : "error" });
            }
            if (campaign.whatsapp_enabled && !flags?.whatsapp_paused) {
              const { ok } = await invokeFunction("whatsapp-send", { campaignId: campaign.id });
              actions.push({ campaignId: campaign.id, action: "whatsapp-send", result: ok ? "ok" : "error" });
            }
            if (campaign.email_enabled && !flags?.email_paused) {
              const { ok } = await invokeFunction("email-send", { campaignId: campaign.id });
              actions.push({ campaignId: campaign.id, action: "email-send", result: ok ? "ok" : "error" });
            }
            break;
          }

          default:
            break;
        }
      } catch (perCampaignError) {
        actions.push({
          campaignId: campaign.id,
          action: `error:${campaign.status}`,
          result: perCampaignError instanceof Error ? perCampaignError.message : String(perCampaignError),
        });
      }
    }

    await writeAuditLog({
      workspaceId: null,
      action: "orchestrator_sweep",
      metadata: { processed: campaigns.length, actionCount: actions.length },
    });

    return jsonResponse({ success: true, processed: campaigns.length, actions });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
