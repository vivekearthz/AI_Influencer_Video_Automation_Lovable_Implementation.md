import { execFile } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { beforeEach, describe, expect, it } from 'vitest';
import { JsonFileSongsRepository } from '../src/db/json-file-repository.js';
import { advanceSong } from '../src/orchestrator/state-machine.js';
import type { LyricsClient } from '../src/pipeline/1-generate-lyrics.js';
import type { MusicProvider } from '../src/pipeline/music-providers/types.js';
import type { YoutubeClient } from '../src/pipeline/4-publish-youtube.js';
import type { SocialPublisher } from '../src/pipeline/social-publishers/types.js';

const execFileAsync = promisify(execFile);

const SAMPLE_LYRICS_JSON = JSON.stringify({
  title: 'Dare to Build',
  genre: 'indie folk-pop',
  mood: 'hopeful, defiant',
  structure: [
    { section: 'verse', lines: ['Started in a small back room', 'Nobody thought we would break through'] },
    { section: 'chorus', lines: ['We dare, we dare to law', 'Standing tall through it all'] },
  ],
  tags: ['startup', 'founder', 'daretolaw'],
});

function fakeDeps(assetsDir: string): {
  lyricsClient: LyricsClient;
  musicProvider: MusicProvider;
  youtubeClient: YoutubeClient;
  socialPublisher: SocialPublisher;
  publishCalls: Array<{ url: string; caption: string }>;
  assetsDir: string;
} {
  const lyricsClient: LyricsClient = { complete: async () => SAMPLE_LYRICS_JSON };

  const musicProvider: MusicProvider = {
    name: 'fake',
    generateSong: async (_lyrics, outputPath) => {
      await execFileAsync('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'anullsrc=r=44100:cl=mono',
        '-t',
        '1',
        '-q:a',
        '9',
        outputPath,
      ]);
      return { audioPath: outputPath, costCents: 40 };
    },
  };

  const youtubeClient: YoutubeClient = { uploadVideo: async () => 'yt-fake-id' };

  const publishCalls: Array<{ url: string; caption: string }> = [];
  const socialPublisher: SocialPublisher = {
    name: 'fake-social',
    publish: async (url, caption) => {
      publishCalls.push({ url, caption });
      return { postIds: ['social-post-1'] };
    },
  };

  return { lyricsClient, musicProvider, youtubeClient, socialPublisher, publishCalls, assetsDir };
}

describe('advanceSong end-to-end (real ffmpeg/sharp, fake network providers)', () => {
  let assetsDir: string;

  beforeEach(() => {
    assetsDir = mkdtempSync(join(tmpdir(), 'music-automation-e2e-'));
  });

  it('walks pending_lyrics -> pending_review with zero human input, then stays there when AUTO_APPROVE is off', async () => {
    const repo = new JsonFileSongsRepository(':memory:');
    let song = await repo.create('Dare to Law');
    const deps = fakeDeps(assetsDir);

    song = await advanceSong(repo, song, { ...deps, autoApprove: false }); // pending_lyrics -> lyrics_ready
    expect(song.status).toBe('lyrics_ready');

    song = await advanceSong(repo, song, { ...deps, autoApprove: false }); // lyrics_ready -> music_ready
    expect(song.status).toBe('music_ready');

    song = await advanceSong(repo, song, { ...deps, autoApprove: false }); // music_ready -> pending_review
    expect(song.status).toBe('pending_review');
    expect(song.videoAssetPath).toBeTruthy();

    // With the human review gate on (the recommended default), the state
    // machine must NOT progress past pending_review on its own.
    const stillWaiting = await advanceSong(repo, song, { ...deps, autoApprove: false });
    expect(stillWaiting.status).toBe('pending_review');

    await repo.close();
  });

  it('goes all the way to published with zero human input when AUTO_APPROVE is on', async () => {
    const repo = new JsonFileSongsRepository(':memory:');
    let song = await repo.create('Innovexsis Consulting');
    const deps = fakeDeps(assetsDir);
    const withAutoApprove = { ...deps, autoApprove: true };

    for (const expected of ['lyrics_ready', 'music_ready', 'pending_review', 'approved', 'published']) {
      song = await advanceSong(repo, song, withAutoApprove);
      expect(song.status).toBe(expected);
    }

    expect(song.youtubeVideoId).toBe('yt-fake-id');
    expect(song.socialPostIds).toEqual(['social-post-1']);
    expect(deps.publishCalls).toHaveLength(1);
    expect(deps.publishCalls[0].url).toContain('yt-fake-id');
    expect(song.costCentsSpent).toBeGreaterThan(0);

    await repo.close();
  });

  it('marks a song failed with the error recorded, instead of leaving it stuck, when a stage throws', async () => {
    const repo = new JsonFileSongsRepository(':memory:');
    let song = await repo.create('Dare to Law');

    const brokenLyricsClient: LyricsClient = { complete: async () => 'not valid json' };
    song = await advanceSong(repo, song, { lyricsClient: brokenLyricsClient });

    expect(song.status).toBe('failed');
    expect(song.reviewNotes).toBeTruthy();

    await repo.close();
  });
});
