// deno-lint-ignore-file no-explicit-any
// Meta Graph API adapter for Instagram + Facebook (spec §12 Instagram/Facebook).
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";
import { resolveAccessToken } from "./tokenResolver.ts";

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

export async function publishToInstagram(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  const igUserId = account.metadata?.igUserId as string | undefined;
  if (!token || !igUserId) {
    return { status: "needs_approval", reason: "Instagram business account is not fully connected." };
  }

  try {
    const mediaField = post.mediaType === "video" ? "video_url" : "image_url";
    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [mediaField]: post.mediaUrl,
        caption: post.caption,
        media_type: post.mediaType === "video" ? "REELS" : undefined,
        access_token: token,
      }),
    });

    if (!containerRes.ok) {
      const text = await containerRes.text();
      return { status: "failed", reason: `Instagram container creation failed (${containerRes.status}): ${text}` };
    }

    const container = await containerRes.json();

    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });

    if (!publishRes.ok) {
      const text = await publishRes.text();
      return { status: "failed", reason: `Instagram publish failed (${publishRes.status}): ${text}` };
    }

    const published = await publishRes.json();
    return {
      status: "published",
      externalPostId: published.id,
      url: published.id ? `https://www.instagram.com/p/${published.id}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown Instagram publishing error" };
  }
}

export async function publishToFacebook(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  const pageId = account.metadata?.pageId as string | undefined;
  if (!token || !pageId) {
    return { status: "needs_approval", reason: "Facebook Page is not fully connected." };
  }

  try {
    const endpoint = post.mediaType === "video" ? `${GRAPH_BASE}/${pageId}/videos` : `${GRAPH_BASE}/${pageId}/photos`;
    const mediaField = post.mediaType === "video" ? "file_url" : "url";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [mediaField]: post.mediaUrl,
        description: post.caption,
        access_token: token,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", reason: `Facebook publish failed (${res.status}): ${text}` };
    }

    const json = await res.json();
    return {
      status: "published",
      externalPostId: json.id ?? json.post_id,
      url: json.id ? `https://www.facebook.com/${json.id}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown Facebook publishing error" };
  }
}
