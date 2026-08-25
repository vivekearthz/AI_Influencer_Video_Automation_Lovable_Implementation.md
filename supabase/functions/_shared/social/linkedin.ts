// deno-lint-ignore-file no-explicit-any
// LinkedIn Posts API adapter (spec §12 LinkedIn flow).
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";
import { resolveAccessToken } from "./tokenResolver.ts";

const LINKEDIN_API_BASE = "https://api.linkedin.com/rest";
const LINKEDIN_API_VERSION = "202405";

export async function publishToLinkedIn(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  if (!token) {
    return { status: "needs_approval", reason: "LinkedIn account is not connected (missing access token)." };
  }

  const authorUrn = account.metadata?.authorUrn as string | undefined;
  if (!authorUrn) {
    return { status: "needs_approval", reason: "LinkedIn author URN missing — reconnect the account." };
  }

  try {
    // Step 1: register + upload video/image asset.
    const registerRes = await fetch(`${LINKEDIN_API_BASE}/videos?action=initializeUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner: authorUrn },
      }),
    });

    if (!registerRes.ok) {
      const text = await registerRes.text();
      return { status: "failed", reason: `LinkedIn upload init failed (${registerRes.status}): ${text}` };
    }

    const registerJson = await registerRes.json();
    const uploadUrl = registerJson.value?.uploadInstructions?.[0]?.uploadUrl;
    const videoUrn = registerJson.value?.video;

    if (uploadUrl) {
      const mediaRes = await fetch(post.mediaUrl);
      const mediaBuffer = await mediaRes.arrayBuffer();
      const uploadRes = await fetch(uploadUrl, { method: "PUT", body: mediaBuffer });
      if (!uploadRes.ok) {
        return { status: "failed", reason: `LinkedIn media upload failed (${uploadRes.status})` };
      }
    }

    // Step 2: create the post referencing the uploaded media.
    const postRes = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: [post.caption, ...(post.hashtags ?? []).map((h) => `#${h}`)].filter(Boolean).join("\n\n"),
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        content: videoUrn ? { media: { id: videoUrn } } : undefined,
        lifecycleState: "PUBLISHED",
      }),
    });

    if (!postRes.ok) {
      const text = await postRes.text();
      return { status: "failed", reason: `LinkedIn post creation failed (${postRes.status}): ${text}` };
    }

    const postId = postRes.headers.get("x-restli-id") ?? undefined;
    return {
      status: "published",
      externalPostId: postId,
      url: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown LinkedIn publishing error" };
  }
}
