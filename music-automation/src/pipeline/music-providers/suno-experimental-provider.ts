import type { Lyrics } from '../../db/types.js';
import { env } from '../../config/env.js';
import type { GeneratedMusic, MusicProvider } from './types.js';

/**
 * EXPERIMENTAL / NOT RECOMMENDED FOR PRODUCTION.
 *
 * As of 2026, Suno has no public self-serve developer API -- it announced a
 * "partner program" intake form in July 2026 but has not opened general
 * access, published pricing, or documented endpoints. Any "Suno API" you
 * can buy today is an unofficial third-party wrapper around Suno's
 * consumer app, which carries real Terms of Service risk (Suno's ToS
 * prohibits automated/unauthorized access).
 *
 * This class exists only so the pipeline's provider interface is honored if
 * you have independently vetted and accepted the risk of a specific
 * wrapper service. It intentionally refuses to run unless you set
 * SUNO_API_BASE_URL yourself, and it does not ship with a default,
 * hard-coded endpoint.
 *
 * Recommended default is ElevenLabsMusicProvider instead -- it is an
 * official, documented, ToS-compliant API. See music-providers/factory.ts.
 */
export class SunoExperimentalProvider implements MusicProvider {
  readonly name = 'suno-experimental';

  constructor(private apiKey: string = env.SUNO_API_KEY, private baseUrl: string = env.SUNO_API_BASE_URL) {}

  async generateSong(_lyrics: Lyrics, _outputPath: string): Promise<GeneratedMusic> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error(
        '[music/suno-experimental] Suno has no official public API as of 2026. Set both ' +
          'SUNO_API_KEY and SUNO_API_BASE_URL to a specific third-party wrapper you have ' +
          "personally vetted to use this provider -- it is disabled by default. We recommend " +
          'MUSIC_PROVIDER=elevenlabs instead.'
      );
    }
    throw new Error(
      '[music/suno-experimental] not implemented: wire this against the specific wrapper ' +
        'endpoint/schema you vetted (its request/response shape is not standardized).'
    );
  }
}
