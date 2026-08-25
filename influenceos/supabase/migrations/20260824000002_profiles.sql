-- -----------------------------------------------------------------------------
-- Core user profile (spec §3 `users` table). Role is chosen at signup
-- (`/signup` role selector) and stored in auth.users.raw_user_meta_data so
-- the profile row can be created by trigger with the right role already set.
-- -----------------------------------------------------------------------------

do $$ begin
  create type user_role as enum ('creator', 'brand', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'creator',
  email text not null,
  phone text,
  full_name text,
  city text,
  is_18_plus_confirmed boolean not null default false,
  verified_bool boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row (with the role chosen at signup) whenever a
-- new auth user is created. The 18+ self-certification checkbox is
-- required client-side before signup can even be submitted (spec §6 footnote:
-- "Do not collect date of birth... add an 18+ self-certification checkbox
-- instead, and block signup below that").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email, full_name, is_18_plus_confirmed)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'creator'),
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'is_18_plus_confirmed')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
