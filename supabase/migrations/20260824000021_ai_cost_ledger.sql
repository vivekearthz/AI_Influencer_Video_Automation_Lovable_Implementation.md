-- Cost ledger (spec §52).

create table if not exists public.ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  job_id uuid references public.ai_generation_jobs(id) on delete set null,
  provider text not null,
  model text,
  operation text not null,
  units numeric,
  unit_type text default 'second',
  estimated_cost numeric,
  actual_cost numeric,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_cost_ledger_workspace on public.ai_cost_ledger(workspace_id);
create index if not exists idx_ai_cost_ledger_campaign on public.ai_cost_ledger(campaign_id);
create index if not exists idx_ai_cost_ledger_created_at on public.ai_cost_ledger(created_at);
