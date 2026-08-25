-- -----------------------------------------------------------------------------
-- Per-workspace cost guardrails + the admin "kill switch" (spec §53, §74).
-- -----------------------------------------------------------------------------

create table if not exists public.automation_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,

  -- Cost guardrails (spec §53)
  max_cost_per_video_usd numeric not null default 5,
  max_daily_spend_usd numeric not null default 25,
  max_monthly_spend_usd numeric not null default 250,
  max_retries integer not null default 2,
  default_quality_profile text not null default 'economy'
    check (default_quality_profile in ('economy', 'balanced', 'premium')),

  -- Emergency controls (spec §74)
  video_generation_paused boolean not null default false,
  social_publishing_paused boolean not null default false,
  whatsapp_paused boolean not null default false,
  email_paused boolean not null default false,
  third_party_publishing_enabled boolean not null default true,

  default_timezone text not null default 'Asia/Kolkata',

  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_automation_settings_updated_at on public.automation_settings;
create trigger trg_automation_settings_updated_at
  before update on public.automation_settings
  for each row execute function public.set_updated_at();

-- Auto-provision default automation settings whenever a workspace is created.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.automation_settings (workspace_id, default_timezone)
  values (new.id, coalesce(new.timezone, 'Asia/Kolkata'))
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_workspace_created on public.workspaces;
create trigger trg_on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();
