import ffmpeg from 'fluent-ffmpeg';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Song, SongsRepository } from '../db/types.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { generateCoverArt } from './cover-art.js';

export function renderLyricVideo(audioPath: string, coverImagePath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(coverImagePath)
      .loop()
      .input(audioPath)
      .videoFilters("scale=1080:1080,zoompan=z='min(zoom+0.0005,1.1)':d=1")
      .outputOptions(['-shortest', '-pix_fmt', 'yuv420p'])
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}

export async function generateVideo(
  repo: SongsRepository,
  song: Song,
  assetsDir: string = env.ASSETS_DIR
): Promise<Song> {
  if (!song.lyrics || !song.musicAssetPath) {
    throw new Error(`song ${song.id} is missing lyrics or music asset`);
  }

  const songDir = join(assetsDir, song.id);
  const coverPath = join(songDir, 'cover.png');
  const videoPath = join(songDir, 'video.mp4');
  await mkdir(dirname(videoPath), { recursive: true });

  logger.info('rendering cover art + video', { songId: song.id });
  await generateCoverArt(song.lyrics.title, song.sourceTheme, coverPath);
  await renderLyricVideo(song.musicAssetPath, coverPath, videoPath);

  return repo.update(song.id, { status: 'pending_review', videoAssetPath: videoPath });
}
