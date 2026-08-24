-- Voice library (spec §42).

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null default 'elevenlabs',
  provider_voice_id text,
  name text not null,
  language text not null default 'English',
  gender text,
  style text,
  enabled boolean not null default true,
  consent_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voice_profiles_workspace on public.voice_profiles(workspace_id);

alter table public.presenters
  add constraint presenters_voice_profile_fk
  foreign key (voice_profile_id) references public.voice_profiles(id) on delete set null;

drop trigger if exists trg_voice_profiles_updated_at on public.voice_profiles;
create trigger trg_voice_profiles_updated_at
  before update on public.voice_profiles
  for each row execute function public.set_updated_at();
