import type { Song, SongsRepository } from '../db/types.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { assertUnderMonthlyCostCap } from '../lib/cost-guardrail.js';
import { generateLyrics, type LyricsClient } from '../pipeline/1-generate-lyrics.js';
import { generateMusic } from '../pipeline/2-generate-music.js';
import type { MusicProvider } from '../pipeline/music-providers/types.js';
import { generateVideo } from '../pipeline/3-generate-video.js';
import { publishToYoutube, type YoutubeClient } from '../pipeline/4-publish-youtube.js';
import { publishToSoundcloud, SoundCloudPublisher } from '../pipeline/4-publish-soundcloud.js';
import type { SocialPublisher } from '../pipeline/social-publishers/types.js';
import { notifyForReview } from '../pipeline/5-notify-review.js';

export interface OrchestratorDeps {
  lyricsClient?: LyricsClient;
  musicProvider?: MusicProvider;
  youtubeClient?: YoutubeClient;
  socialPublisher?: SocialPublisher | null;
  soundcloudClient?: SoundCloudPublisher;
  repoSlug?: string;
  /** Overrides env.AUTO_APPROVE for this call -- mainly for tests. */
  autoApprove?: boolean;
  /** Overrides env.ASSETS_DIR for this call -- mainly for tests. */
  assetsDir?: string;
}

/**
 * Advances a single song exactly one pipeline stage forward and persists
 * the result. Designed to be called repeatedly (by run-once.ts in a loop,
 * or by daemon.ts on a cron tick) until the song reaches a terminal state.
 * Every stage is idempotent-ish: on failure the song is marked 'failed'
 * with the error recorded in review_notes rather than left in limbo, so a
 * retried run (or a human) can see exactly what broke and why.
 */
export async function advanceSong(repo: SongsRepository, song: Song, deps: OrchestratorDeps = {}): Promise<Song> {
  const repoSlug = deps.repoSlug ?? 'unknown/unknown';

  try {
    switch (song.status) {
      case 'pending_lyrics':
        return await generateLyrics(repo, song, deps.lyricsClient);

      case 'lyrics_ready':
        await assertUnderMonthlyCostCap(repo);
        return await generateMusic(repo, song, deps.musicProvider, deps.assetsDir);

      case 'music_ready': {
        const updated = await generateVideo(repo, song, deps.assetsDir);
        await notifyForReview(updated.id, updated.lyrics?.title ?? updated.sourceTheme, updated.videoAssetPath ?? '', repoSlug);
        return updated;
      }

      case 'pending_review': {
        const autoApprove = deps.autoApprove ?? env.AUTO_APPROVE;
        if (!autoApprove) {
          logger.info('song awaiting human review (AUTO_APPROVE=false)', { songId: song.id });
          return song;
        }
        logger.info('AUTO_APPROVE=true -- auto-approving without a human tap', { songId: song.id });
        return await repo.update(song.id, { status: 'approved' });
      }

      case 'approved': {
        if (!song.lyrics || !song.videoAssetPath) {
          throw new Error('approved song is missing lyrics or a rendered video');
        }

        const { videoId, costCents: ytCost } = await publishToYoutube(
          song.videoAssetPath,
          song.lyrics.title,
          `${song.sourceTheme} -- an InnoVexis Consulting founder-brand song.`,
          deps.youtubeClient
        );
        await repo.addCostCents(song.id, ytCost);

        const youtubeUrl = `https://youtu.be/${videoId}`;

        let socialPostIds: string[] = [];
        if (deps.socialPublisher) {
          const result = await deps.socialPublisher.publish(
            youtubeUrl,
            `New song: "${song.lyrics.title}" -- ${song.sourceTheme}. Listen: ${youtubeUrl}`
          );
          socialPostIds = result.postIds;
        } else {
          logger.info('no social publisher configured (SOCIAL_PUBLISHER=none) -- skipping', { songId: song.id });
        }

        const soundcloudTrackId = await publishToSoundcloud(
          song.musicAssetPath ?? '',
          song.lyrics.title,
          song.sourceTheme,
          deps.soundcloudClient
        );

        return await repo.update(song.id, {
          status: 'published',
          youtubeVideoId: videoId,
          soundcloudTrackId: soundcloudTrackId ?? undefined,
          socialPostIds,
        });
      }

      default:
        return song;
    }
  } catch (err) {
    logger.error('stage failed', { songId: song.id, status: song.status, error: String(err) });
    return repo.update(song.id, { status: 'failed', reviewNotes: String(err) });
  }
}
