-- -----------------------------------------------------------------------------
-- AI provider registry (spec §4, §6.1). Global catalog — enabling/disabling
-- and prioritising per workspace happens through ai_provider_credentials so
-- one workspace's Gemini key never leaks into another's.
-- -----------------------------------------------------------------------------

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text unique not null,
  provider_name text not null,
  provider_type text not null
    check (provider_type in ('text', 'image', 'video', 'avatar', 'tts', 'music', 'storage', 'social', 'email', 'whatsapp', 'third_party_publisher')),
  capabilities jsonb not null default '[]',
  enabled boolean not null default true,
  priority integer not null default 100,
  cost_score numeric not null default 50,
  quality_score numeric not null default 50,
  latency_score numeric not null default 50,
  supports_portrait boolean not null default false,
  supports_audio boolean not null default false,
  supports_reference_image boolean not null default false,
  supports_async_jobs boolean not null default true,
  docs_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ai_providers_updated_at on public.ai_providers;
create trigger trg_ai_providers_updated_at
  before update on public.ai_providers
  for each row execute function public.set_updated_at();
