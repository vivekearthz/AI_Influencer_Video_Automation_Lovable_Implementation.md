import type { SongsRepository } from '../db/types.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Keeps the pipeline perpetually fed with zero human intervention: once per
 * SONG_INTERVAL_DAYS, queue exactly one new song per configured source
 * theme. This is what makes "no one has to remember to kick this off" true
 * -- a scheduled run with nothing to do yet, that still notices a theme is
 * due for a new song, and queues it itself.
 */
export async function seedDueSongs(repo: SongsRepository): Promise<number> {
  const all = await repo.all();
  const cutoffMs = env.SONG_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let created = 0;

  for (const theme of env.sourceThemes) {
    const songsForTheme = all.filter((s) => s.sourceTheme === theme);
    const mostRecent = songsForTheme.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const isDue = !mostRecent || now - new Date(mostRecent.createdAt).getTime() >= cutoffMs;

    if (isDue) {
      logger.info('seeding new song for theme', { theme });
      await repo.create(theme);
      created += 1;
    }
  }

  return created;
}
