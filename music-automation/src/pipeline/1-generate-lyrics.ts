import type { SongsRepository, Lyrics, Song } from '../db/types.js';
import { env, requireEnv } from '../config/env.js';
import { LYRIC_PROMPT } from '../prompts/lyric-prompt-template.js';
import { ESTIMATED_COST_CENTS } from '../lib/cost-guardrail.js';
import { logger } from '../lib/logger.js';

export interface LyricsClient {
  complete(prompt: string): Promise<string>;
}

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * Free-tier lyrics writer using any OpenAI-compatible chat-completions
 * endpoint. Defaults to Groq (genuinely free, no credit card required --
 * see README "Cost optimization"), but works unmodified against:
 *  - your own OmniBridge deployment (this account's own free-LLM-router
 *    project) -- just set LYRICS_API_BASE_URL to its /api/v1 URL
 *  - Google Gemini's OpenAI-compatible endpoint
 *  - OpenRouter's free-tier models
 *  - or a paid provider, if you ever want one -- nothing here is
 *    Groq-specific beyond the default URL/model.
 */
export class OpenAICompatibleLyricsClient implements LyricsClient {
  constructor(
    private baseUrl: string = env.LYRICS_API_BASE_URL,
    private apiKey: string = env.LYRICS_API_KEY,
    private model: string = env.LYRICS_MODEL,
    private http: HttpClient = defaultHttpClient
  ) {}

  async complete(prompt: string): Promise<string> {
    const res = await this.http.fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[lyrics] request to ${this.baseUrl} failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error('[lyrics] response had no message content');
    return text;
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
  client: LyricsClient = new OpenAICompatibleLyricsClient()
): Promise<Song> {
  requireEnv(['LYRICS_API_KEY'], 'generate-lyrics');

  logger.info('generating lyrics', { songId: song.id, theme: song.sourceTheme });
  const text = await client.complete(LYRIC_PROMPT(song.sourceTheme));
  const lyrics = parseLyrics(text);

  await repo.update(song.id, { status: 'lyrics_ready', lyrics });
  return repo.addCostCents(song.id, ESTIMATED_COST_CENTS.lyricsGeneration);
}
