import { createReadStream } from 'node:fs';
import { google } from 'googleapis';
import { env, requireEnv } from '../config/env.js';
import { ESTIMATED_COST_CENTS } from '../lib/cost-guardrail.js';
import { logger } from '../lib/logger.js';

export interface YoutubeClient {
  uploadVideo(videoPath: string, title: string, description: string): Promise<string>;
}

/**
 * Direct YouTube Data API v3 upload. Fully automatable once the one-time
 * OAuth consent has been done (see scripts/youtube-oauth.mjs) -- the
 * refresh token then lets every subsequent run publish with zero human
 * interaction, indefinitely (refresh tokens don't expire from inactivity
 * the way access tokens do, only if revoked).
 */
export class GoogleYoutubeClient implements YoutubeClient {
  async uploadVideo(videoPath: string, title: string, description: string): Promise<string> {
    requireEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'], 'publish-youtube');

    const oauth2Client = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title, description, categoryId: '10' }, // 10 = Music
        status: { privacyStatus: env.YOUTUBE_PRIVACY_STATUS },
      },
      media: { body: createReadStream(videoPath) },
    });

    if (!res.data.id) throw new Error('[publish-youtube] upload succeeded but returned no video id');
    return res.data.id;
  }
}

export async function publishToYoutube(
  videoPath: string,
  title: string,
  description: string,
  client: YoutubeClient = new GoogleYoutubeClient()
): Promise<{ videoId: string; costCents: number }> {
  logger.info('publishing to youtube', { title });
  const videoId = await client.uploadVideo(videoPath, title, description);
  return { videoId, costCents: ESTIMATED_COST_CENTS.youtubePublish };
}
