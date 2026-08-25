// deno-lint-ignore-file no-explicit-any
// TikTok Content Posting API adapter (spec §12 TikTok).
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";
import { resolveAccessToken } from "./tokenResolver.ts";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export async function publishToTikTok(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  if (!token) {
    return { status: "needs_approval", reason: "Direct automated publishing is unavailable for TikTok: account not connected. Choose an approved publisher or move this post to the human approval queue." };
  }

  try {
    const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: post.caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.mediaUrl,
        },
      }),
    });

    if (!initRes.ok) {
      const text = await initRes.text();
      return { status: "failed", reason: `TikTok publish init failed (${initRes.status}): ${text}` };
    }

    const json = await initRes.json();
    const publishId = json.data?.publish_id;
    if (!publishId) {
      return { status: "needs_approval", reason: "TikTok did not return a publish id — required permissions may be missing." };
    }

    return { status: "queued", externalPostId: publishId };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown TikTok publishing error" };
  }
}

export async function getTikTokPublishStatus(account: NativeAdapterAccount, publishId: string): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  if (!token) return { status: "failed", reason: "TikTok account not connected." };

  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!res.ok) return { status: "failed", reason: `TikTok status check failed (${res.status})` };

  const json = await res.json();
  const status = json.data?.status;
  if (status === "PUBLISH_COMPLETE") {
    return { status: "published", externalPostId: publishId, publishedAt: new Date().toISOString() };
  }
  if (status === "FAILED") {
    return { status: "failed", reason: json.data?.fail_reason ?? "TikTok processing failed" };
  }
  return { status: "queued", externalPostId: publishId };
}
