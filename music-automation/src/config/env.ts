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
  // Free-tier by default: Groq's OpenAI-compatible endpoint, no credit
  // card required. Point LYRICS_API_BASE_URL/LYRICS_MODEL at any other
  // OpenAI-compatible provider (your own OmniBridge deployment, Gemini,
  // OpenRouter) with no code changes -- see README "Cost optimization".
  LYRICS_API_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  LYRICS_API_KEY: z.string().optional().default(''),
  LYRICS_MODEL: z.string().default('llama-3.3-70b-versatile'),

  // Free, open-source, self-hostable music+vocals model. Defaults to the
  // official public Hugging Face Space (free shared GPU, no API key) --
  // see acestep-provider.ts for exactly how, and README for the
  // self-hosted alternative if you want guaranteed availability.
  ACE_STEP_BASE_URL: z.string().default('https://ace-step-ace-step.hf.space'),
  HF_TOKEN: z.string().optional().default(''),
  ACE_STEP_DURATION_SECONDS: z.coerce.number().default(120),
  ACE_STEP_INFER_STEPS: z.coerce.number().default(60),

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

  // Free SMTP email notifications -- works with a free Gmail account (App
  // Password), Zoho Mail Free, Brevo, Resend's free SMTP relay, etc. See
  // README for exact setup per provider.
  EMAIL_ENABLED: boolFromString,
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default(''),
  EMAIL_TO: z.string().optional().default(''),

  // WhatsApp via Meta's official Cloud API. The API itself is free; see
  // README for the one nuance that isn't free (unprompted/business-
  // initiated notifications are billed a fraction of a cent each unless
  // sent inside a customer-initiated 24h window).
  WHATSAPP_ENABLED: boolFromString,
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(''),
  WHATSAPP_TO_NUMBER: z.string().optional().default(''),

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
