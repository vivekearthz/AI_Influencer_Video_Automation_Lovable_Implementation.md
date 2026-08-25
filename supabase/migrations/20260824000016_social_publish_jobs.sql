-- Social publishing jobs / state machine (spec §30-§31, §33).

create table if not exists public.social_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  asset_id uuid references public.campaign_assets(id) on delete set null,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  publisher_type text not null default 'native_api' check (publisher_type in ('native_api', 'third_party', 'manual')),
  idempotency_key text not null,
  status text not null default 'draft' check (status in (
    'draft', 'ready', 'queued', 'uploading', 'processing', 'published',
    'failed', 'retrying', 'blocked', 'needs_approval', 'cancelled'
  )),
  caption text,
  hashtags text[] not null default '{}',
  scheduled_at timestamptz,
  external_post_id text,
  external_url text,
  request_payload jsonb not null default '{}',
  response_payload jsonb not null default '{}',
  error_message text,
  retry_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists idx_social_publish_jobs_campaign on public.social_publish_jobs(campaign_id);
create index if not exists idx_social_publish_jobs_status on public.social_publish_jobs(status);
create index if not exists idx_social_publish_jobs_account on public.social_publish_jobs(social_account_id);

drop trigger if exists trg_social_publish_jobs_updated_at on public.social_publish_jobs;
create trigger trg_social_publish_jobs_updated_at
  before update on public.social_publish_jobs
  for each row execute function public.set_updated_at();
