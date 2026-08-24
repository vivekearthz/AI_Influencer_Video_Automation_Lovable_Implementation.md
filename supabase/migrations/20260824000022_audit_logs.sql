-- Audit log (spec §51).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_workspace on public.audit_logs(workspace_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
