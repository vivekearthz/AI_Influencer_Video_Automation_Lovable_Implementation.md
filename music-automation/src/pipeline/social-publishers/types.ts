export interface SocialPublishResult {
  postIds: string[];
}

export interface SocialPublisher {
  readonly name: string;
  publish(videoUrlOrPath: string, caption: string): Promise<SocialPublishResult>;
}
