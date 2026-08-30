import type { Lyrics } from '../../db/types.js';

export interface GeneratedMusic {
  /** Absolute or relative path to the rendered audio file on disk. */
  audioPath: string;
  /** Rough cost estimate in cents, for the cost ledger. */
  costCents: number;
}

export interface MusicProvider {
  readonly name: string;
  generateSong(lyrics: Lyrics, outputPath: string): Promise<GeneratedMusic>;
}
