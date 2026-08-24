-- AI generation jobs / queue ledger (spec §8, §32-§33).

create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  job_type text not null check (job_type in (
    'script', 'presenter_image', 'video', 'voice', 'subtitle', 'thumbnail',
    'caption', 'translation', 'render', 'qc'
  )),
  provider text,
  model text,
  external_job_id text,
  idempotency_key text not null,
  status text not null default 'queued' check (status in (
    'queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled', 'needs_review'
  )),
  attempt integer not null default 1,
  max_attempts integer not null default 2,
  request_payload jsonb not null default '{}',
  response_payload jsonb not null default '{}',
  error_message text,
  estimated_cost numeric,
  actual_cost numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists idx_ai_generation_jobs_campaign on public.ai_generation_jobs(campaign_id);
create index if not exists idx_ai_generation_jobs_status on public.ai_generation_jobs(status);
create index if not exists idx_ai_generation_jobs_type on public.ai_generation_jobs(job_type);

drop trigger if exists trg_ai_generation_jobs_updated_at on public.ai_generation_jobs;
create trigger trg_ai_generation_jobs_updated_at
  before update on public.ai_generation_jobs
  for each row execute function public.set_updated_at();
