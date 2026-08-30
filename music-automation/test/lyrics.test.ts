import { describe, expect, it } from 'vitest';
import { JsonFileSongsRepository } from '../src/db/json-file-repository.js';
import { generateLyrics, parseLyrics, type LyricsClient } from '../src/pipeline/1-generate-lyrics.js';

const SAMPLE_LYRICS_JSON = JSON.stringify({
  title: 'Dare to Build',
  genre: 'indie folk-pop',
  mood: 'hopeful, defiant',
  structure: [
    { section: 'verse', lines: ['Started in a small back room', 'Nobody thought we would break through'] },
    { section: 'chorus', lines: ['We dare, we dare to law', 'Standing tall through it all'] },
  ],
  tags: ['startup', 'founder', 'daretolaw', 'grind', 'anthem'],
});

describe('parseLyrics', () => {
  it('parses clean JSON', () => {
    const lyrics = parseLyrics(SAMPLE_LYRICS_JSON);
    expect(lyrics.title).toBe('Dare to Build');
    expect(lyrics.structure).toHaveLength(2);
  });

  it('strips markdown code fences some models add anyway', () => {
    const lyrics = parseLyrics('```json\n' + SAMPLE_LYRICS_JSON + '\n```');
    expect(lyrics.title).toBe('Dare to Build');
  });

  it('throws a clear error for malformed responses', () => {
    expect(() => parseLyrics('not json at all')).toThrow();
    expect(() => parseLyrics('{"title": "x"}')).toThrow(/expected shape/);
  });
});

describe('generateLyrics', () => {
  it('stores parsed lyrics and advances status to lyrics_ready', async () => {
    const repo = new JsonFileSongsRepository(':memory:');
    const song = await repo.create('Dare to Law');

    const fakeClient: LyricsClient = { complete: async () => SAMPLE_LYRICS_JSON };
    const updated = await generateLyrics(repo, song, fakeClient);

    expect(updated.status).toBe('lyrics_ready');
    expect(updated.lyrics?.title).toBe('Dare to Build');
    expect(updated.costCentsSpent).toBeGreaterThan(0);

    await repo.close();
  });
});
