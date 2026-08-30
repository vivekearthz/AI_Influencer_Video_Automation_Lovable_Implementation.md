import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * SoundCloud upload via the self-service developer API.
 *
 * IMPORTANT, updated from the original build spec: SoundCloud's public app
 * registration used to be closed to new developers, so uploads were treated
 * as a manual/distributor step. As of 2026, SoundCloud opened a genuinely
 * self-service developer portal -- but it requires an active **Artist Pro**
 * subscription to generate a Client ID/Secret (see
 * https://developers.soundcloud.com/blog/vibe-coding-ai-agent-docs-self-serve-api-keys/).
 * That subscription is the one recurring cost this stage needs; there is no
 * further per-call charge and no manual step after the one-time OAuth
 * authorization (see scripts/soundcloud-oauth.mjs).
 *
 * If SOUNDCLOUD_ENABLED is false (default), this stage is skipped entirely
 * and the orchestrator treats SoundCloud as an intentionally-manual /
 * distributor-handled channel, exactly as the original spec recommended --
 * flip the flag on once you've decided to pay for Artist Pro.
 */
export class SoundCloudPublisher {
  constructor(
    private clientId: string = env.SOUNDCLOUD_CLIENT_ID,
    private accessToken: string = env.SOUNDCLOUD_ACCESS_TOKEN,
    private http: HttpClient = defaultHttpClient
  ) {}

  async uploadTrack(audioPath: string, title: string, description: string): Promise<string> {
    if (!this.accessToken || !this.clientId) {
      throw new Error(
        '[publish-soundcloud] missing SOUNDCLOUD_CLIENT_ID / SOUNDCLOUD_ACCESS_TOKEN. Run ' +
          '`npm run oauth:soundcloud` once (requires an Artist Pro subscription) to set these up.'
      );
    }

    logger.info('uploading to soundcloud', { title });
    const fileBuffer = await readFile(audioPath);
    const form = new FormData();
    form.set('track[title]', title);
    form.set('track[description]', description);
    form.set('track[sharing]', 'public');
    form.set('track[asset_data]', new Blob([fileBuffer], { type: 'audio/mpeg' }), 'track.mp3');

    const res = await this.http.fetch('https://api.soundcloud.com/tracks', {
      method: 'POST',
      headers: { Authorization: `OAuth ${this.accessToken}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[publish-soundcloud] upload failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as { id: number };
    return String(json.id);
  }
}

export async function publishToSoundcloud(
  audioPath: string,
  title: string,
  description: string,
  client: SoundCloudPublisher = new SoundCloudPublisher()
): Promise<string | null> {
  if (!env.SOUNDCLOUD_ENABLED) {
    logger.info('soundcloud publishing disabled (SOUNDCLOUD_ENABLED=false) -- treating as manual/distributor step');
    return null;
  }
  return client.uploadTrack(audioPath, title, description);
}
