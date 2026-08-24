-- -----------------------------------------------------------------------------
-- Model registry (spec §22). Lets an admin swap "current video model" from
-- veo-3.1-lite to a future/cheaper model without redeploying the app.
-- -----------------------------------------------------------------------------

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  model_key text not null,
  display_name text,
  capability text not null
    check (capability in ('text', 'image', 'video', 'avatar', 'tts', 'music')),
  enabled boolean not null default true,
  is_default boolean not null default false,
  quality_score numeric,
  cost_per_second numeric,
  cost_per_unit numeric,
  unit_type text default 'second',
  supports_audio boolean not null default false,
  supports_portrait boolean not null default false,
  supports_reference_image boolean not null default false,
  max_duration_seconds integer,
  deprecated_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, model_key)
);

create index if not exists idx_ai_models_capability on public.ai_models(capability);

drop trigger if exists trg_ai_models_updated_at on public.ai_models;
create trigger trg_ai_models_updated_at
  before update on public.ai_models
  for each row execute function public.set_updated_at();
