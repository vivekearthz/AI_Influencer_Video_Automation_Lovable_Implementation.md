-- -----------------------------------------------------------------------------
-- Per-workspace provider enablement + health status (spec §6.2).
--
-- IMPORTANT: this table stores a *reference* to a secret (credential_ref),
-- e.g. the name of a Supabase Edge Function secret such as "GEMINI_API_KEY".
-- It never stores the raw API key itself. Actual secrets live in Supabase
-- Function secrets (`supabase secrets set ...`) and are only readable from
-- server-side Edge Function code.
-- -----------------------------------------------------------------------------

create table if not exists public.ai_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  account_label text,
  credential_ref text not null,
  enabled boolean not null default true,
  last_health_check timestamptz,
  health_status text default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy', 'not_configured')),
  health_detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider_id, account_label)
);

create index if not exists idx_ai_provider_credentials_workspace on public.ai_provider_credentials(workspace_id);

drop trigger if exists trg_ai_provider_credentials_updated_at on public.ai_provider_credentials;
create trigger trg_ai_provider_credentials_updated_at
  before update on public.ai_provider_credentials
  for each row execute function public.set_updated_at();
