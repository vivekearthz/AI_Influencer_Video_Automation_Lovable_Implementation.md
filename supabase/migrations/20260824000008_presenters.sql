-- -----------------------------------------------------------------------------
-- Presenter library (spec §41). Each presenter pairs a reference image with a
-- voice profile so the same "persona" can be reused across many campaigns.
-- -----------------------------------------------------------------------------

do $$ begin
  create type presenter_source_type as enum ('generated', 'licensed_stock', 'user_uploaded', 'employee', 'client');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.presenters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  style text,
  age_range text,
  clothing_style text,
  languages text[] not null default '{}',
  reference_image_url text,
  voice_profile_id uuid,
  brand_associations text[] not null default '{}',
  source_type presenter_source_type not null default 'generated',
  consent_confirmed boolean not null default false,
  consent_metadata jsonb not null default '{}',
  status text not null default 'available' check (status in ('available', 'generating', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint presenters_consent_required check (
    source_type not in ('user_uploaded', 'employee') or consent_confirmed = true
  )
);

create index if not exists idx_presenters_workspace on public.presenters(workspace_id);

drop trigger if exists trg_presenters_updated_at on public.presenters;
create trigger trg_presenters_updated_at
  before update on public.presenters
  for each row execute function public.set_updated_at();
