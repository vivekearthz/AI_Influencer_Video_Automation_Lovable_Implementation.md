import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const csv = (v: string | undefined): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5'),

  MUSIC_PROVIDER: z.enum(['elevenlabs', 'suno']).default('elevenlabs'),
  ELEVENLABS_API_KEY: z.string().optional().default(''),
  ELEVENLABS_MODEL_ID: z.string().default('music_v2'),
  MUSIC_REFERENCE_AUDIO_PATH: z.string().optional().default(''),
  SUNO_API_KEY: z.string().optional().default(''),
  SUNO_API_BASE_URL: z.string().optional().default(''),

  COVER_TITLE_FONT_COLOR: z.string().default('#ffffff'),
  COVER_BACKGROUND_COLOR_FROM: z.string().default('#0f172a'),
  COVER_BACKGROUND_COLOR_TO: z.string().default('#312e81'),
  ASSETS_DIR: z.string().default('./assets'),

  YOUTUBE_CLIENT_ID: z.string().optional().default(''),
  YOUTUBE_CLIENT_SECRET: z.string().optional().default(''),
  YOUTUBE_REFRESH_TOKEN: z.string().optional().default(''),
  YOUTUBE_PRIVACY_STATUS: z.enum(['public', 'unlisted', 'private']).default('public'),

  SOCIAL_PUBLISHER: z.enum(['buffer', 'postiz', 'none']).default('buffer'),
  BUFFER_ACCESS_TOKEN: z.string().optional().default(''),
  BUFFER_CHANNEL_IDS: z.string().optional().default(''),
  POSTIZ_BASE_URL: z.string().optional().default('http://localhost:5000'),
  POSTIZ_API_KEY: z.string().optional().default(''),
  POSTIZ_INTEGRATION_IDS: z.string().optional().default(''),

  SOUNDCLOUD_ENABLED: boolFromString,
  SOUNDCLOUD_CLIENT_ID: z.string().optional().default(''),
  SOUNDCLOUD_CLIENT_SECRET: z.string().optional().default(''),
  SOUNDCLOUD_ACCESS_TOKEN: z.string().optional().default(''),
  SOUNDCLOUD_REFRESH_TOKEN: z.string().optional().default(''),

  SLACK_WEBHOOK_URL: z.string().optional().default(''),
  AUTO_APPROVE: boolFromString,

  DATABASE_URL: z.string().optional().default(''),
  DB_FILE_PATH: z.string().default('./data/songs.json'),

  MAX_SONGS_PER_RUN: z.coerce.number().int().positive().default(3),
  MAX_MONTHLY_COST_CENTS: z.coerce.number().int().nonnegative().default(5000),

  SOURCE_THEMES: z.string().optional().default('Dare to Law,Innovexsis Consulting'),
  SONG_INTERVAL_DAYS: z.coerce.number().int().positive().default(7),

  GITHUB_REPOSITORY: z.string().optional().default(''),
  GITHUB_SERVER_URL: z.string().optional().default('https://github.com'),
  GITHUB_RUN_ID: z.string().optional().default(''),
});

const parsed = EnvSchema.parse(process.env);

export const env = {
  ...parsed,
  sourceThemes: csv(parsed.SOURCE_THEMES),
  bufferChannelIds: csv(parsed.BUFFER_CHANNEL_IDS),
  postizIntegrationIds: csv(parsed.POSTIZ_INTEGRATION_IDS),
};

export type Env = typeof env;

/** Throws with a clear, actionable message if a stage's required config is missing. */
export function requireEnv(keys: Array<keyof typeof parsed>, forStage: string): void {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[${forStage}] missing required environment variable(s): ${missing.join(', ')}. ` +
        `See .env.example for where to get each one.`
    );
  }
}
