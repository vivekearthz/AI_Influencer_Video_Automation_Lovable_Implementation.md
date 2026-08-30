import { writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Lyrics } from '../../db/types.js';
import { env } from '../../config/env.js';
import { ESTIMATED_COST_CENTS } from '../../lib/cost-guardrail.js';
import { logger } from '../../lib/logger.js';
import type { GeneratedMusic, MusicProvider } from './types.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

function chunkText(section: Lyrics['structure'][number]): string {
  const label = `[${section.section.charAt(0).toUpperCase()}${section.section.slice(1)}]`;
  return `${label}\n${section.lines.join('\n')}`;
}

function chunkDurationMs(section: Lyrics['structure'][number]): number {
  // ElevenLabs Music v2 chunk duration must be between 3_000 and 120_000 ms.
  const estimate = 4000 + section.lines.length * 2500;
  return Math.min(Math.max(estimate, 3000), 60000);
}

/**
 * Fully-automatable music provider using the ElevenLabs Music API
 * (POST /v1/music), which is a real, documented, production-ready
 * text-to-music API as of 2026 -- unlike Suno/Udio, which have no public
 * self-serve API (see SunoExperimentalProvider). Requires a paid ElevenLabs
 * plan; the Music API is not available on the free tier.
 */
export class ElevenLabsMusicProvider implements MusicProvider {
  readonly name = 'elevenlabs';

  constructor(
    private apiKey: string = env.ELEVENLABS_API_KEY,
    private modelId: string = env.ELEVENLABS_MODEL_ID,
    private http: HttpClient = defaultHttpClient
  ) {}

  async generateSong(lyrics: Lyrics, outputPath: string): Promise<GeneratedMusic> {
    if (!this.apiKey) {
      throw new Error(
        '[music/elevenlabs] ELEVENLABS_API_KEY is not set. The Music API requires a paid ' +
          'ElevenLabs plan -- see https://elevenlabs.io/music-api'
      );
    }

    const positiveStyles = [lyrics.genre, lyrics.mood, 'great production quality', ...lyrics.tags].filter(
      Boolean
    );

    const body = {
      composition_plan: {
        positive_global_styles: positiveStyles,
        negative_global_styles: ['low quality', 'distorted'],
        chunks: lyrics.structure.map((section) => ({
          text: chunkText(section),
          duration_ms: chunkDurationMs(section),
          positive_styles: positiveStyles,
        })),
      },
      model_id: this.modelId,
    };

    logger.info('requesting music generation', { provider: this.name, sections: lyrics.structure.length });

    // NOTE: ElevenLabs also offers an "Audio Reference" feature to steer
    // style from a short uploaded clip. As of this writing the exact
    // request shape for passing a reference clip into POST /v1/music is not
    // finalized in the public API reference -- verify against
    // https://elevenlabs.io/docs/api-reference/music/compose before wiring
    // MUSIC_REFERENCE_AUDIO_PATH through here.
    const res = await this.http.fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[music/elevenlabs] generation failed: ${res.status} ${text}`);
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, audioBuffer);

    return { audioPath: outputPath, costCents: ESTIMATED_COST_CENTS.musicGeneration };
  }
}
