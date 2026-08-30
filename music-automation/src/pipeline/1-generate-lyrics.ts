import Anthropic from '@anthropic-ai/sdk';
import type { SongsRepository, Lyrics, Song } from '../db/types.js';
import { env, requireEnv } from '../config/env.js';
import { LYRIC_PROMPT } from '../prompts/lyric-prompt-template.js';
import { ESTIMATED_COST_CENTS } from '../lib/cost-guardrail.js';
import { logger } from '../lib/logger.js';

export interface LyricsClient {
  complete(prompt: string): Promise<string>;
}

/** Thin wrapper around the Anthropic SDK so tests can inject a fake client. */
export class AnthropicLyricsClient implements LyricsClient {
  private client: Anthropic;

  constructor(apiKey: string = env.ANTHROPIC_API_KEY, private model: string = env.ANTHROPIC_MODEL) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  }
}

export function parseLyrics(rawText: string): Lyrics {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Lyrics;
  if (!parsed.title || !Array.isArray(parsed.structure)) {
    throw new Error('lyrics response did not match the expected shape');
  }
  return parsed;
}

export async function generateLyrics(
  repo: SongsRepository,
  song: Song,
  client: LyricsClient = new AnthropicLyricsClient()
): Promise<Song> {
  requireEnv(['ANTHROPIC_API_KEY'], 'generate-lyrics');

  logger.info('generating lyrics', { songId: song.id, theme: song.sourceTheme });
  const text = await client.complete(LYRIC_PROMPT(song.sourceTheme));
  const lyrics = parseLyrics(text);

  await repo.update(song.id, { status: 'lyrics_ready', lyrics });
  return repo.addCostCents(song.id, ESTIMATED_COST_CENTS.lyricsGeneration);
}
