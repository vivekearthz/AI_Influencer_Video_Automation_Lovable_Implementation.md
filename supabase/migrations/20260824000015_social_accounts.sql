-- Social account registry (spec §9).

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform_key text not null references public.platform_catalog(platform_key),
  account_name text,
  account_handle text,
  account_type text,
  connection_type text not null default 'oauth' check (connection_type in ('oauth', 'third_party', 'manual')),
  credential_ref text,
  status text not null default 'disconnected' check (status in (
    'connected', 'disconnected', 'reauthorization_required', 'error'
  )),
  capabilities jsonb not null default '{}',
  last_health_check timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform_key, account_handle)
);

create index if not exists idx_social_accounts_workspace on public.social_accounts(workspace_id);

drop trigger if exists trg_social_accounts_updated_at on public.social_accounts;
create trigger trg_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();
