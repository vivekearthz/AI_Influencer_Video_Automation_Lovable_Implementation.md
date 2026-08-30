import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { generateCoverArt } from '../src/pipeline/cover-art.js';
import { renderLyricVideo } from '../src/pipeline/3-generate-video.js';

const execFileAsync = promisify(execFile);

describe('generateCoverArt', () => {
  it('renders a non-trivial PNG with the song title, no network calls', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'music-automation-cover-'));
    const outputPath = join(dir, 'cover.png');

    await generateCoverArt('Dare to Build (A Very Long Founder Anthem Title)', 'Dare to Law', outputPath);

    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(1000);
  });
});

describe('renderLyricVideo (real ffmpeg, end-to-end)', () => {
  it('assembles a cover image + audio track into a playable mp4', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'music-automation-video-'));
    const coverPath = join(dir, 'cover.png');
    const audioPath = join(dir, 'audio.mp3');
    const videoPath = join(dir, 'video.mp4');

    await generateCoverArt('Dare to Build', 'Dare to Law', coverPath);

    // Generate a tiny 2s silent audio track locally via ffmpeg itself, so
    // this test needs no network access and no real music provider.
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=44100:cl=mono',
      '-t',
      '2',
      '-q:a',
      '9',
      audioPath,
    ]);

    const result = await renderLyricVideo(audioPath, coverPath, videoPath);

    expect(result).toBe(videoPath);
    expect(existsSync(videoPath)).toBe(true);
    expect(statSync(videoPath).size).toBeGreaterThan(1000);
  });
});
