// POST /functions/v1/social-publish  { campaignId: string, retryJobId?: string }
// Executes queued social_publish_jobs through the unified router (spec §10-11,
// §30-31, §56-58, §64).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getCampaignForCaller, updateCampaignStatus } from "../_shared/campaignAccess.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { publishToChannel, createApprovalTask } from "../_shared/social/socialRouter.ts";
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

    let query = supabase
      .from("social_publish_jobs")
      .select("*, social_accounts(*)")
      .eq("campaign_id", campaign.id);

    query = body.retryJobId ? query.eq("id", body.retryJobId) : query.in("status", ["ready", "queued", "failed"]);

    const { data: jobs, error } = await query;
    if (error) throw error;

    if (!jobs?.length) {
      return jsonResponse({ success: true, published: 0, message: "No jobs ready to publish." });
    }

    await updateCampaignStatus(campaign.id, "publishing");

    const { data: finalVideo } = await supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("asset_type", "final_video")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summary = { published: 0, queued: 0, needsApproval: 0, failed: 0 };

    for (const job of jobs) {
      const account = (job as any).social_accounts;
      if (!account) {
        await supabase.from("social_publish_jobs").update({ status: "failed", error_message: "Social account no longer exists" }).eq("id", job.id);
        summary.failed += 1;
        continue;
      }

      await supabase.from("social_publish_jobs").update({ status: "processing", retry_count: job.retry_count + (body.retryJobId ? 1 : 0) }).eq("id", job.id);

      const { result, publisherType } = await publishToChannel({
        workspaceId: campaign.workspace_id,
        account: {
          id: account.id,
          platform_key: account.platform_key,
          account_handle: account.account_handle,
          credential_ref: account.credential_ref,
          metadata: account.metadata ?? {},
        },
        publisherTier: job.publisher_type,
        post: {
          caption: job.caption ?? campaign.name,
          hashtags: job.hashtags ?? [],
          mediaUrl: finalVideo?.public_url ?? "",
          mediaType: "video",
          scheduledAt: job.scheduled_at ?? undefined,
        },
      });

      await supabase
        .from("social_publish_jobs")
        .update({
          status: result.status,
          publisher_type: publisherType,
          external_post_id: result.externalPostId,
          external_url: result.url,
          error_message: result.reason,
          published_at: result.publishedAt,
          response_payload: result as unknown as Record<string, unknown>,
        })
        .eq("id", job.id);

      if (result.status === "published") summary.published += 1;
      else if (result.status === "queued") summary.queued += 1;
      else if (result.status === "needs_approval") {
        summary.needsApproval += 1;
        await createApprovalTask({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          publishJobId: job.id,
          channel: account.platform_key,
          assetUrl: finalVideo?.public_url,
          caption: job.caption ?? undefined,
          reason: result.reason ?? "Direct automated publishing unavailable for this channel.",
        });
      } else {
        summary.failed += 1;
      }
    }

    const { data: allJobs } = await supabase.from("social_publish_jobs").select("status").eq("campaign_id", campaign.id);
    const allSettled = (allJobs ?? []).every((j) => ["published", "needs_approval", "failed", "cancelled"].includes(j.status));
    if (allSettled) {
      const anyFailed = (allJobs ?? []).some((j) => j.status === "failed");
      await updateCampaignStatus(campaign.id, anyFailed ? "failed" : "completed");
    }

    await writeAuditLog({ workspaceId: campaign.workspace_id, action: "social_publish_run", resourceType: "campaign", resourceId: campaign.id, metadata: summary });

    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
