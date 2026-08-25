// deno-lint-ignore-file no-explicit-any
// X (Twitter) API v2 adapter.
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";
import { resolveAccessToken } from "./tokenResolver.ts";

const X_API_BASE = "https://api.twitter.com/2";
const X_UPLOAD_BASE = "https://upload.twitter.com/1.1";

export async function publishToX(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  if (!token) {
    return { status: "needs_approval", reason: "X account is not connected (missing access token)." };
  }

  try {
    const mediaRes = await fetch(post.mediaUrl);
    const mediaBuffer = new Uint8Array(await mediaRes.arrayBuffer());
    const base64Media = btoa(String.fromCharCode(...mediaBuffer));

    const uploadRes = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        media_data: base64Media,
        media_category: post.mediaType === "video" ? "tweet_video" : "tweet_image",
      }),
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      return { status: "failed", reason: `X media upload failed (${uploadRes.status}): ${text}` };
    }

    const uploadJson = await uploadRes.json();
    const mediaId = uploadJson.media_id_string;

    const tweetRes = await fetch(`${X_API_BASE}/tweets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: [post.caption, ...(post.hashtags ?? []).map((h) => `#${h}`)].filter(Boolean).join(" "),
        media: mediaId ? { media_ids: [mediaId] } : undefined,
      }),
    });

    if (!tweetRes.ok) {
      const text = await tweetRes.text();
      return { status: "failed", reason: `X tweet creation failed (${tweetRes.status}): ${text}` };
    }

    const tweetJson = await tweetRes.json();
    const tweetId = tweetJson.data?.id;
    return {
      status: "published",
      externalPostId: tweetId,
      url: tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown X publishing error" };
  }
}
