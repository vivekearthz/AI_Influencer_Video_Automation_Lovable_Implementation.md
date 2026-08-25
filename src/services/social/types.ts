// Social publishing contracts (spec §10, §13, §57).

export interface SocialPost {
  caption: string;
  hashtags?: string[];
  mediaUrl?: string;
  scheduledAt?: string;
}

export interface PublishResult {
  platform: string;
  status: "published" | "queued" | "failed" | "needs_approval";
  externalPostId?: string;
  url?: string;
  publishedAt?: string;
  reason?: string;
}

export interface SocialPublisher {
  platform: string;
  validateConnection(accountId: string): Promise<boolean>;
  uploadMedia(accountId: string, assetUrl: string): Promise<{ mediaId: string }>;
  publish(accountId: string, post: SocialPost): Promise<PublishResult>;
  getStatus(externalPostId: string): Promise<PublishResult>;
  delete?(externalPostId: string): Promise<void>;
}

export interface ThirdPartyPublisher {
  provider: string;
  validate(): Promise<boolean>;
  publishVideo(input: {
    accountId: string;
    videoUrl: string;
    caption: string;
    scheduledAt?: string;
  }): Promise<PublishResult>;
}
