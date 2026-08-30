import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Lyrics } from '../../db/types.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { GeneratedMusic, MusicProvider } from './types.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

interface GradioFileData {
  path: string;
  url: string;
  orig_name?: string;
}

/**
 * Genuinely free, open-source music+vocals provider: ACE-Step
 * (https://github.com/ace-step/ACE-Step, Apache-2.0), called over HTTP
 * against its official public Hugging Face Space, which runs on HF's
 * shared free "ZeroGPU" compute -- no API key, no subscription, no per-call
 * cost. This request/response shape (endpoint name `__call__`, the exact
 * 22-parameter order below, and the SSE polling protocol) was verified
 * against the live Space on 2026-08-30 with a real end-to-end generation
 * (submitted a job, polled to completion in ~7s, downloaded a valid 10s
 * 320kbps mp3) -- not guessed from docs.
 *
 * Caveats, stated plainly:
 *  - This is a shared community resource with no uptime/latency SLA. It
 *    can queue behind other users, or the Space owner can change the
 *    UI (and therefore this parameter order) at any time.
 *  - For reliable/low-latency production use, self-host ACE-Step instead
 *    (same HTTP protocol -- just point ACE_STEP_BASE_URL at your own GPU
 *    machine running `python gradio_app.py` from the ACE-Step repo. See
 *    README "Free, self-hosted alternative for music generation").
 *  - Setting HF_TOKEN (a free Hugging Face account access token) is
 *    optional but gives better rate limits on the shared public Space.
 */
export class AceStepMusicProvider implements MusicProvider {
  readonly name = 'acestep';

  constructor(
    private baseUrl: string = env.ACE_STEP_BASE_URL,
    private hfToken: string = env.HF_TOKEN,
    private http: HttpClient = defaultHttpClient
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.hfToken) headers.Authorization = `Bearer ${this.hfToken}`;
    return headers;
  }

  private buildLyricsText(lyrics: Lyrics): string {
    return lyrics.structure.map((s) => `[${s.section}]\n${s.lines.join('\n')}`).join('\n\n');
  }

  private buildTags(lyrics: Lyrics): string {
    return [lyrics.genre, lyrics.mood, ...lyrics.tags].filter(Boolean).join(', ');
  }

  async generateSong(lyrics: Lyrics, outputPath: string): Promise<GeneratedMusic> {
    const tags = this.buildTags(lyrics);
    const lyricsText = this.buildLyricsText(lyrics);

    // Exact parameter order for the `__call__` endpoint on the public
    // ACE-Step/ACE-Step Space, verified against its live /config schema.
    const data = [
      env.ACE_STEP_DURATION_SECONDS, // Audio Duration (seconds, -1 = auto)
      tags, // Tags
      lyricsText, // Lyrics
      env.ACE_STEP_INFER_STEPS, // Infer Steps
      15.0, // Guidance Scale
      'euler', // Scheduler Type
      'apg', // CFG Type
      10.0, // Granularity Scale
      '', // manual seeds
      0.5, // Guidance Interval
      0.0, // Guidance Interval Decay
      3.0, // Min Guidance Scale
      true, // use ERG for tag
      false, // use ERG for lyric
      true, // use ERG for diffusion
      '', // OSS Steps
      0.0, // Guidance Scale Text
      0.0, // Guidance Scale Lyric
      false, // Enable Audio2Audio
      0.5, // Refer audio strength
      null, // Reference Audio
      'none', // Lora Name or Path
    ];

    logger.info('requesting music generation', { provider: this.name, baseUrl: this.baseUrl });

    const submitRes = await this.http.fetch(`${this.baseUrl}/gradio_api/call/__call__`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ data }),
    });
    if (!submitRes.ok) {
      const text = await submitRes.text().catch(() => '');
      throw new Error(`[music/acestep] failed to submit job: ${submitRes.status} ${text}`);
    }
    const { event_id: eventId } = (await submitRes.json()) as { event_id: string };

    const streamRes = await this.http.fetch(`${this.baseUrl}/gradio_api/call/__call__/${eventId}`, {
      headers: this.headers(),
    });
    if (!streamRes.ok) {
      const text = await streamRes.text().catch(() => '');
      throw new Error(`[music/acestep] failed to read result stream: ${streamRes.status} ${text}`);
    }
    const streamText = await streamRes.text();
    const audioFile = parseGradioSseForAudio(streamText);

    const audioRes = await this.http.fetch(audioFile.url, { headers: this.headers() });
    if (!audioRes.ok) {
      throw new Error(`[music/acestep] failed to download generated audio: ${audioRes.status}`);
    }
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);

    return { audioPath: outputPath, costCents: 0 };
  }
}

/**
 * Parses a Gradio queue-based SSE response (one or more `event: ...` /
 * `data: ...` blocks) and returns the audio FileData from the final
 * `complete` event. Throws with the server's own message on an `error`
 * event.
 */
export function parseGradioSseForAudio(streamText: string): GradioFileData {
  const blocks = streamText.split(/\n\n+/).filter((b) => b.trim().length > 0);

  for (const block of blocks.reverse()) {
    const eventMatch = block.match(/^event:\s*(\w+)/m);
    const dataMatch = block.match(/^data:\s*(.+)$/ms);
    if (!eventMatch || !dataMatch) continue;

    if (eventMatch[1] === 'error') {
      throw new Error(`[music/acestep] generation failed: ${dataMatch[1]}`);
    }
    if (eventMatch[1] === 'complete') {
      const payload = JSON.parse(dataMatch[1]) as [GradioFileData, ...unknown[]];
      if (!payload[0]?.url) throw new Error('[music/acestep] completed but no audio file was returned');
      return payload[0];
    }
  }

  throw new Error('[music/acestep] result stream ended without a complete or error event');
}
