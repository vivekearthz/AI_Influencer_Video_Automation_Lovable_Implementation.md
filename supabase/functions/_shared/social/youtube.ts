// deno-lint-ignore-file no-explicit-any
// YouTube Data API adapter (spec §12 YouTube flow).
import type { NativeAdapterAccount, PublishResult, SocialPost } from "./types.ts";
import { resolveAccessToken } from "./tokenResolver.ts";

export async function publishToYouTube(account: NativeAdapterAccount, post: SocialPost): Promise<PublishResult> {
  const token = resolveAccessToken(account.credential_ref);
  if (!token) {
    return { status: "needs_approval", reason: "YouTube account is not connected (missing access token)." };
  }

  try {
    const mediaRes = await fetch(post.mediaUrl);
    const mediaBuffer = await mediaRes.arrayBuffer();

    const metadata = {
      snippet: {
        title: post.caption.slice(0, 100) || "AI-generated video",
        description: post.caption,
        tags: post.hashtags ?? [],
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    // Multipart upload: metadata (JSON) + media (video/mp4).
    const boundary = "youtube_upload_boundary";
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`,
      mediaBuffer,
      `\r\n--${boundary}--`,
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", reason: `YouTube upload failed (${res.status}): ${text}` };
    }

    const json = await res.json();
    return {
      status: "published",
      externalPostId: json.id,
      url: json.id ? `https://youtube.com/watch?v=${json.id}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return { status: "failed", reason: err?.message ?? "Unknown YouTube publishing error" };
  }
}
