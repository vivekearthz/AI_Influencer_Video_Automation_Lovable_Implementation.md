import { env, requireEnv } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { SocialPublishResult, SocialPublisher } from './types.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * Self-hosted Postiz (https://github.com/gitroomhq/postiz-app), AGPL-3,
 * $0/month forever on your own infra (see README "Free self-hosted
 * alternative"). Same REST API surface on Postiz Cloud and any self-hosted
 * instance: POST {POSTIZ_BASE_URL}/api/public/v1/posts. Supports 25+
 * platforms incl. LinkedIn, Instagram, TikTok, YouTube, Threads, Bluesky,
 * Reddit, Mastodon, Discord, Slack -- pick this provider when you want zero
 * recurring subscription cost instead of Buffer's free-plan rate limits.
 *
 * Connect each integration once in the Postiz UI (OAuth per platform, same
 * one-time step every scheduler requires), then list the integration ids
 * in POSTIZ_INTEGRATION_IDS.
 */
export class PostizPublisher implements SocialPublisher {
  readonly name = 'postiz';

  constructor(
    private baseUrl: string = env.POSTIZ_BASE_URL,
    private apiKey: string = env.POSTIZ_API_KEY,
    private integrationIds: string[] = env.postizIntegrationIds,
    private http: HttpClient = defaultHttpClient
  ) {}

  async publish(videoUrl: string, caption: string): Promise<SocialPublishResult> {
    requireEnv(['POSTIZ_API_KEY'], 'publish-postiz');
    if (this.integrationIds.length === 0) {
      throw new Error(
        '[publish-postiz] POSTIZ_INTEGRATION_IDS is empty -- connect each channel once in the ' +
          'Postiz UI, then list their integration ids here.'
      );
    }

    logger.info('publishing via postiz', { integrations: this.integrationIds.length });
    const res = await this.http.fetch(`${this.baseUrl}/api/public/v1/posts`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'now',
        posts: this.integrationIds.map((integrationId) => ({
          integration: { id: integrationId },
          value: [{ content: caption, url: videoUrl }],
        })),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[publish-postiz] request failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as { postIds?: string[]; id?: string };
    return { postIds: json.postIds ?? (json.id ? [json.id] : []) };
  }
}
