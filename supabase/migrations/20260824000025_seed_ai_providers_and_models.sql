-- -----------------------------------------------------------------------------
-- Seed the provider + model registry (spec §3, §22, §76). Providers are
-- inserted as `enabled = true` (they are visible in the UI), but the actual
-- health-check (supabase/functions/provider-health-check) verifies whether a
-- matching secret is really configured before anything is allowed to use it.
-- -----------------------------------------------------------------------------

insert into public.ai_providers
  (provider_key, provider_name, provider_type, capabilities, priority, cost_score, quality_score, latency_score,
   supports_portrait, supports_audio, supports_reference_image, supports_async_jobs, docs_url)
values
  ('gemini', 'Google Gemini', 'text', '["text", "image"]', 10, 20, 80, 70, false, false, true, false,
    'https://ai.google.dev/gemini-api/docs'),
  ('veo', 'Google Veo (3.1 Lite/Fast)', 'video', '["video"]', 10, 40, 80, 40, true, true, true, true,
    'https://ai.google.dev/gemini-api/docs/video'),
  ('elevenlabs', 'ElevenLabs', 'tts', '["tts"]', 10, 35, 85, 65, false, true, false, true,
    'https://elevenlabs.io/docs'),
  ('kling', 'Kling Avatar', 'avatar', '["avatar"]', 50, 45, 75, 40, true, true, true, true,
    'https://klingai.com'),
  ('canva', 'Canva', 'image', '["image"]', 60, 30, 70, 60, false, false, true, false,
    'https://www.canva.com/developers/'),
  ('meta', 'Meta Graph API (Instagram/Facebook)', 'social', '["social"]', 10, 0, 0, 0, false, false, false, true,
    'https://developers.facebook.com/docs/graph-api'),
  ('linkedin', 'LinkedIn Posts API', 'social', '["social"]', 10, 0, 0, 0, false, false, false, true,
    'https://learn.microsoft.com/en-us/linkedin/marketing/'),
  ('youtube', 'YouTube Data API', 'social', '["social"]', 10, 0, 0, 0, false, false, false, true,
    'https://developers.google.com/youtube/v3'),
  ('tiktok', 'TikTok Content Posting API', 'social', '["social"]', 10, 0, 0, 0, false, false, false, true,
    'https://developers.tiktok.com/doc/content-posting-api-get-started'),
  ('x', 'X (Twitter) API', 'social', '["social"]', 10, 0, 0, 0, false, false, false, true,
    'https://developer.x.com/en/docs'),
  ('third_party_publisher', 'Approved Third-Party Publisher', 'third_party_publisher', '["social"]', 90, 30, 60, 60, false, false, false, true,
    'https://www.ayrshare.com/docs/'),
  ('whatsapp_cloud', 'WhatsApp Business Cloud API', 'whatsapp', '["whatsapp"]', 10, 0, 0, 0, false, false, false, true,
    'https://developers.facebook.com/docs/whatsapp/cloud-api'),
  ('email_transactional', 'Transactional Email Provider', 'email', '["email"]', 10, 0, 0, 0, false, false, false, true,
    'https://resend.com/docs')
on conflict (provider_key) do nothing;

-- Text models
insert into public.ai_models (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_unit, unit_type, metadata)
select id, 'gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 'text', true, 70, 0, 'request', '{"role": "primary"}'
from public.ai_providers where provider_key = 'gemini'
on conflict (provider_id, model_key) do nothing;

insert into public.ai_models (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_unit, unit_type, metadata)
select id, 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro (fallback)', 'text', false, 90, 0, 'request', '{"role": "fallback"}'
from public.ai_providers where provider_key = 'gemini'
on conflict (provider_id, model_key) do nothing;

-- Image models (presenter reference images, thumbnails)
insert into public.ai_models (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_unit, unit_type, supports_reference_image, metadata)
select id, 'imagen-3.0-generate-002', 'Imagen 3', 'image', true, 80, 0, 'image', true, '{"role": "primary"}'
from public.ai_providers where provider_key = 'gemini'
on conflict (provider_id, model_key) do nothing;

-- Video models (Veo 3.1)
insert into public.ai_models
  (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_second, unit_type,
   supports_audio, supports_portrait, supports_reference_image, max_duration_seconds, metadata)
select id, 'veo-3.1-lite-generate-preview', 'Veo 3.1 Lite (720p)', 'video', true, 65, 0.05, 'second',
  true, true, true, 8, '{"role": "primary", "resolution": "720p", "price_notes": "~$0.05/sec 720p, ~$0.08/sec 1080p — verify current pricing with provider"}'
from public.ai_providers where provider_key = 'veo'
on conflict (provider_id, model_key) do nothing;

insert into public.ai_models
  (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_second, unit_type,
   supports_audio, supports_portrait, supports_reference_image, max_duration_seconds, metadata)
select id, 'veo-3.1-fast-generate-preview', 'Veo 3.1 Fast (720p)', 'video', false, 80, 0.10, 'second',
  true, true, true, 8, '{"role": "fallback", "resolution": "720p", "price_notes": "~$0.10/sec 720p, ~$0.12/sec 1080p — verify current pricing with provider"}'
from public.ai_providers where provider_key = 'veo'
on conflict (provider_id, model_key) do nothing;

-- Voice / TTS
insert into public.ai_models (provider_id, model_key, display_name, capability, is_default, quality_score, cost_per_unit, unit_type, supports_audio, metadata)
select id, 'eleven_multilingual_v2', 'ElevenLabs Multilingual v2', 'tts', true, 85, 0, 'character', true, '{"role": "primary"}'
from public.ai_providers where provider_key = 'elevenlabs'
on conflict (provider_id, model_key) do nothing;
