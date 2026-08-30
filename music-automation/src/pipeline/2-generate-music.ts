import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Song, SongsRepository } from '../db/types.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createMusicProvider } from './music-providers/factory.js';
import type { MusicProvider } from './music-providers/types.js';

export async function generateMusic(
  repo: SongsRepository,
  song: Song,
  provider: MusicProvider = createMusicProvider(),
  assetsDir: string = env.ASSETS_DIR
): Promise<Song> {
  if (!song.lyrics) throw new Error(`song ${song.id} has no lyrics yet`);

  const outputPath = join(assetsDir, song.id, 'song.mp3');
  await mkdir(dirname(outputPath), { recursive: true });
  logger.info('generating music', { songId: song.id, provider: provider.name });

  const { audioPath, costCents } = await provider.generateSong(song.lyrics, outputPath);

  await repo.update(song.id, { status: 'music_ready', musicAssetPath: audioPath });
  return repo.addCostCents(song.id, costCents);
}
