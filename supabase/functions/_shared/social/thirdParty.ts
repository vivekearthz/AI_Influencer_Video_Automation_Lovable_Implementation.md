// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Approved third-party publisher adapter (spec §13). Generic REST shape
// compatible with Ayrshare-style APIs (single API key, POST /post with a
// list of target platforms). Swapping providers (Buffer/Publer/Metricool)
// only requires changing THIRD_PARTY_PUBLISHER_PROVIDER + the request
// shape in this one file — the rest of the app is unaffected.
// -----------------------------------------------------------------------------
import type { PublishResult, SocialPost } from "./types.ts";

function requireApiKey(): string {
  const key = Deno.env.get("THIRD_PARTY_PUBLISHER_API_KEY");
  if (!key) throw new Error("THIRD_PARTY_PUBLISHER_API_KEY is not configured.");
  return key;
}

export function isThirdPartyPublisherConfigured(): boolean {
  return Boolean(Deno.env.get("THIRD_PARTY_PUBLISHER_API_KEY"));
}

export async function publishViaThirdParty(input: {
  platformKey: string;
  accountHandle: string | null;
  post: SocialPost;
}): Promise<PublishResult> {
  const apiKey = requireApiKey();
  const provider = Deno.env.get("THIRD_PARTY_PUBLISHER_PROVIDER") ?? "ayrshare";

  try {
    const res = await fetch("https://api.ayrshare.com/api/post", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post: input.post.caption,
        platforms: [input.platformKey],
        mediaUrls: [input.post.mediaUrl],
        scheduleDate: input.post.scheduledAt,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", reason: `Third-party publisher (${provider}) failed (${res.status}): ${text}` };
    }

    const json = await res.json();
    const postId = json.id ?? json.postIds?.[input.platformKey];
    return {
      status: input.post.scheduledAt ? "queued" : "published",
      externalPostId: postId,
      url: json.postUrls?.[input.platformKey],
      publishedAt: input.post.scheduledAt ? undefined : new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? `Unknown ${provider} publishing error` };
  }
}
