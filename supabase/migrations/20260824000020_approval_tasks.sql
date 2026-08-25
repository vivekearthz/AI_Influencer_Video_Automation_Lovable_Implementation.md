-- Human approval queue (spec §58) — the safe fallback for channels/claims
-- that cannot or should not be published automatically.

create table if not exists public.approval_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  publish_job_id uuid references public.social_publish_jobs(id) on delete cascade,
  channel text,
  asset_url text,
  caption text,
  reason text not null,
  category text not null default 'unsupported_channel' check (category in (
    'unsupported_channel', 'content_safety', 'financial_claim', 'medical_claim',
    'legal_claim', 'celebrity_likeness', 'unverified_claim', 'contact_info_error',
    'copyright_concern', 'presenter_identity_concern', 'provider_safety_flag', 'other'
  )),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected', 'published')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approval_tasks_workspace on public.approval_tasks(workspace_id);
create index if not exists idx_approval_tasks_status on public.approval_tasks(status);

drop trigger if exists trg_approval_tasks_updated_at on public.approval_tasks;
create trigger trg_approval_tasks_updated_at
  before update on public.approval_tasks
  for each row execute function public.set_updated_at();
