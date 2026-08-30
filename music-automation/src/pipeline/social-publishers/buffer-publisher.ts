import { env, requireEnv } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { SocialPublishResult, SocialPublisher } from './types.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * Buffer's GraphQL API (api.buffer.com), official, free-plan-eligible,
 * personal-API-key auth. As of 2026 there is no third-party OAuth path for
 * onboarding many end users on Buffer's new API, but for a single brand
 * account managing its own channels (this use case) a personal API key is
 * exactly right, and free: 1 API key + 3,000 requests/30 days on the Free
 * plan. Connect each destination channel (LinkedIn, Instagram, etc.) once
 * in the Buffer UI -- that one-time OAuth per channel is inherent to every
 * platform's own security model and can't be automated away by any tool.
 *
 * Buffer requires media to be a publicly reachable URL, not a raw file
 * upload -- see README "Where the rendered video actually lives" for why
 * this publisher defaults to a link-attachment post (pointing at the
 * YouTube URL just published) rather than re-uploading the video natively.
 * Set PUBLIC_ASSET_BASE_URL if you want native video attachments instead.
 */
export class BufferPublisher implements SocialPublisher {
  readonly name = 'buffer';

  constructor(
    private accessToken: string = env.BUFFER_ACCESS_TOKEN,
    private channelIds: string[] = env.bufferChannelIds,
    private http: HttpClient = defaultHttpClient
  ) {}

  async publish(videoUrl: string, caption: string): Promise<SocialPublishResult> {
    requireEnv(['BUFFER_ACCESS_TOKEN'], 'publish-buffer');
    if (this.channelIds.length === 0) {
      throw new Error(
        '[publish-buffer] BUFFER_CHANNEL_IDS is empty -- connect LinkedIn/Instagram/etc in the ' +
          'Buffer UI once, then list their channel ids here.'
      );
    }

    const postIds: string[] = [];
    for (const channelId of this.channelIds) {
      logger.info('scheduling buffer post', { channelId });
      const res = await this.http.fetch('https://api.buffer.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation CreatePost($input: CreatePostInput!) {
              createPost(input: $input) {
                ... on PostActionSuccess { post { id } }
                ... on MutationError { message }
              }
            }`,
          variables: {
            input: {
              text: caption,
              channelId,
              schedulingType: 'automatic',
              mode: 'addToQueue',
              metadata: { linkAttachment: { url: videoUrl } },
            },
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`[publish-buffer] request failed: ${res.status} ${text}`);
      }

      const json = (await res.json()) as {
        data?: { createPost?: { post?: { id?: string }; message?: string } };
        errors?: Array<{ message: string }>;
      };
      const result = json.data?.createPost;
      if (result?.message) throw new Error(`[publish-buffer] ${result.message}`);
      if (json.errors?.length) throw new Error(`[publish-buffer] ${json.errors[0].message}`);
      if (result?.post?.id) postIds.push(result.post.id);
    }

    return { postIds };
  }
}
