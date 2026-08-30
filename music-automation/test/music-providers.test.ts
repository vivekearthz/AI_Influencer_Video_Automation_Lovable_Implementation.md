import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ElevenLabsMusicProvider, type HttpClient } from '../src/pipeline/music-providers/elevenlabs-provider.js';
import { SunoExperimentalProvider } from '../src/pipeline/music-providers/suno-experimental-provider.js';
import type { Lyrics } from '../src/db/types.js';

const lyrics: Lyrics = {
  title: 'Dare to Build',
  genre: 'indie folk-pop',
  mood: 'hopeful',
  structure: [
    { section: 'verse', lines: ['line one', 'line two'] },
    { section: 'chorus', lines: ['line three', 'line four'] },
  ],
  tags: ['startup', 'founder'],
};

describe('ElevenLabsMusicProvider', () => {
  it('sends a composition plan built from lyrics and writes the returned audio to disk', async () => {
    let capturedBody: any = null;
    const fakeHttp: HttpClient = {
      fetch: async (url, init) => {
        capturedBody = JSON.parse(init.body as string);
        expect(url).toBe('https://api.elevenlabs.io/v1/music');
        expect(init.headers).toMatchObject({ 'xi-api-key': 'key-123' });
        return new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200 });
      },
    };

    const provider = new ElevenLabsMusicProvider('key-123', 'music_v2', fakeHttp);
    const dir = mkdtempSync(join(tmpdir(), 'music-automation-'));
    const outputPath = join(dir, 'song.mp3');

    const result = await provider.generateSong(lyrics, outputPath);

    expect(result.audioPath).toBe(outputPath);
    expect(result.costCents).toBeGreaterThan(0);
    expect(readFileSync(outputPath)).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(capturedBody.composition_plan.chunks).toHaveLength(2);
    expect(capturedBody.composition_plan.positive_global_styles).toContain('indie folk-pop');
  });

  it('throws a clear, actionable error when the API key is missing', async () => {
    const provider = new ElevenLabsMusicProvider('', 'music_v2', { fetch: async () => new Response() });
    await expect(provider.generateSong(lyrics, '/tmp/x.mp3')).rejects.toThrow(/ELEVENLABS_API_KEY/);
  });

  it('surfaces the API error body on a non-2xx response', async () => {
    const fakeHttp: HttpClient = {
      fetch: async () => new Response('rate limited', { status: 429 }),
    };
    const provider = new ElevenLabsMusicProvider('key-123', 'music_v2', fakeHttp);
    await expect(provider.generateSong(lyrics, '/tmp/x.mp3')).rejects.toThrow(/429/);
  });
});

describe('SunoExperimentalProvider', () => {
  it('refuses to run unless an explicit third-party base URL has been vetted and set', async () => {
    const provider = new SunoExperimentalProvider('', '');
    await expect(provider.generateSong(lyrics, '/tmp/x.mp3')).rejects.toThrow(/no official public API/);
  });
});
