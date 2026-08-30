import { db } from '../db/client.js';
import { TERMINAL_STATUSES } from '../db/types.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createMusicProvider } from '../pipeline/music-providers/factory.js';
import { createSocialPublisher } from '../pipeline/social-publishers/factory.js';
import { seedDueSongs } from './seed.js';
import { advanceSong, type OrchestratorDeps } from './state-machine.js';

const ALL_STATUSES = [
  'pending_lyrics',
  'lyrics_ready',
  'pending_music',
  'music_ready',
  'pending_video',
  'video_ready',
  'pending_review',
  'approved',
] as const;

const MAX_STAGE_HOPS_PER_SONG = 8;

/**
 * A single, deterministic, run-to-completion pass over every song that
 * isn't in a terminal state yet -- the shape that fits a GitHub Actions
 * scheduled workflow (or any other "wake up, do the work, exit" host) far
 * better than a long-lived node-cron daemon. See daemon.ts for the
 * always-on variant if you're self-hosting on a VM instead.
 *
 * Each eligible song is advanced through as many consecutive stages as it
 * can go in one run (e.g. a brand new song can reach pending_review, or all
 * the way to published with AUTO_APPROVE=true, in a single invocation),
 * bounded by MAX_STAGE_HOPS_PER_SONG so a bug can't spin forever.
 */
export async function runOnce(): Promise<void> {
  const repo = db();
  const deps: OrchestratorDeps = {
    musicProvider: createMusicProvider(),
    socialPublisher: createSocialPublisher(),
    repoSlug: env.GITHUB_REPOSITORY || 'your-org/your-repo',
  };

  const seeded = await seedDueSongs(repo);
  if (seeded > 0) logger.info('seeded new songs this run', { count: seeded });

  const eligible = (await repo.findByStatuses([...ALL_STATUSES])).slice(0, env.MAX_SONGS_PER_RUN);

  logger.info('run-once starting', { eligibleSongs: eligible.length, autoApprove: env.AUTO_APPROVE });

  for (const initial of eligible) {
    let current = initial;
    for (let hop = 0; hop < MAX_STAGE_HOPS_PER_SONG; hop++) {
      const before = current.status;
      current = await advanceSong(repo, current, deps);
      if (current.status === before) break; // no progress this hop (e.g. waiting on human review)
      if (TERMINAL_STATUSES.includes(current.status)) break;
    }
  }

  await repo.close();
  logger.info('run-once complete');
}

// Allow `tsx src/orchestrator/run-once.ts` as a standalone entrypoint.
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnce().catch((err) => {
    logger.error('run-once failed', { error: String(err) });
    process.exitCode = 1;
  });
}
