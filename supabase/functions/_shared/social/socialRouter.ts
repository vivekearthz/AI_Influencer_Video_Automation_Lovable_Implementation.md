// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Unified social publishing router (spec §10-11, §56, §64). Always tries, in
// order: 1) official native API, 2) approved third-party publisher,
// 3) human approval queue. Never falls back to password-based automation.
// -----------------------------------------------------------------------------
import { getServiceClient } from "../supabaseClient.ts";
import { getAutomationSettings } from "../costController.ts";
import { publishToLinkedIn } from "./linkedin.ts";
import { publishToYouTube } from "./youtube.ts";
import { publishToInstagram, publishToFacebook } from "./meta.ts";
import { publishToTikTok } from "./tiktok.ts";
import { publishToX } from "./x.ts";
import { publishViaThirdParty, isThirdPartyPublisherConfigured } from "./thirdParty.ts";
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";

const NATIVE_ADAPTERS: Record<string, (account: NativeAdapterAccount, post: SocialPost) => Promise<PublishResult>> = {
  linkedin: publishToLinkedIn,
  youtube: publishToYouTube,
  instagram: publishToInstagram,
  facebook: publishToFacebook,
  tiktok: publishToTikTok,
  x: publishToX,
};

export async function publishToChannel(input: {
  workspaceId: string;
  account: NativeAdapterAccount;
  publisherTier: "native_api" | "third_party" | "manual";
  post: SocialPost;
}): Promise<{ result: PublishResult; publisherType: "native_api" | "third_party" | "manual" }> {
  const settings = await getAutomationSettings(input.workspaceId);

  if (settings?.social_publishing_paused) {
    return {
      publisherType: "manual",
      result: { status: "needs_approval", reason: "Social publishing is paused for this workspace (Emergency Controls)." },
    };
  }

  // Priority 1: official native API.
  if (input.publisherTier === "native_api") {
    const adapter = NATIVE_ADAPTERS[input.account.platform_key];
    if (adapter) {
      const result = await adapter(input.account, input.post);
      if (result.status !== "needs_approval") {
        return { result, publisherType: "native_api" };
      }
      // fall through to third-party / manual below
    }
  }

  // Priority 2: approved third-party publisher.
  if (settings?.third_party_publishing_enabled !== false && isThirdPartyPublisherConfigured()) {
    const result = await publishViaThirdParty({
      platformKey: input.account.platform_key,
      accountHandle: input.account.account_handle,
      post: input.post,
    });
    if (result.status !== "failed") {
      return { result, publisherType: "third_party" };
    }
  }

  // Priority 3: human approval queue.
  return {
    publisherType: "manual",
    result: {
      status: "needs_approval",
      reason: `Direct automated publishing is unavailable for ${input.account.platform_key}. Choose an approved publisher or move this post to the human approval queue.`,
    },
  };
}

export async function createApprovalTask(input: {
  workspaceId: string;
  campaignId: string;
  publishJobId: string;
  channel: string;
  assetUrl?: string;
  caption?: string;
  reason: string;
}) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("approval_tasks").insert({
    workspace_id: input.workspaceId,
    campaign_id: input.campaignId,
    publish_job_id: input.publishJobId,
    channel: input.channel,
    asset_url: input.assetUrl,
    caption: input.caption,
    reason: input.reason,
    category: "unsupported_channel",
  });
  if (error) console.error("[socialRouter] failed to create approval task", error);
}
