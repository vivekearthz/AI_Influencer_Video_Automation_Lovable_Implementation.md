import { AceStepMusicProvider } from './acestep-provider.js';
import type { MusicProvider } from './types.js';

/**
 * ACE-Step is the only music provider now -- it's free (self-hosted or via
 * the free public Hugging Face Space, see acestep-provider.ts), open
 * source, and produces full songs with vocals from lyrics, which is what
 * this pipeline needs. Paid options (ElevenLabs Music API, Suno wrappers)
 * were removed on purpose; ACE_STEP_BASE_URL is still the single
 * extension point if you ever want to point this at something else
 * (your own self-hosted ACE-Step instance, or a different provider
 * implementing the same MusicProvider interface).
 */
export function createMusicProvider(): MusicProvider {
  return new AceStepMusicProvider();
}

export * from './types.js';
