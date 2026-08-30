import { env } from '../../config/env.js';
import { ElevenLabsMusicProvider } from './elevenlabs-provider.js';
import { SunoExperimentalProvider } from './suno-experimental-provider.js';
import type { MusicProvider } from './types.js';

export function createMusicProvider(): MusicProvider {
  switch (env.MUSIC_PROVIDER) {
    case 'suno':
      return new SunoExperimentalProvider();
    case 'elevenlabs':
    default:
      return new ElevenLabsMusicProvider();
  }
}

export * from './types.js';
