export interface SocialPost {
  caption: string;
  hashtags?: string[];
  mediaUrl: string;
  mediaType: "video" | "image";
  scheduledAt?: string;
}

export interface PublishResult {
  status: "published" | "queued" | "failed" | "needs_approval";
  externalPostId?: string;
  url?: string;
  publishedAt?: string;
  reason?: string;
}

export interface NativeAdapterAccount {
  id: string;
  platform_key: string;
  account_handle: string | null;
  credential_ref: string | null;
  metadata: Record<string, any>;
}
