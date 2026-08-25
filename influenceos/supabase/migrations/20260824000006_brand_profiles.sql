-- Brand company details + subscription state (spec §3 brand_profiles, §7 Razorpay flow).

do $$ begin
  create type subscription_tier as enum ('starter', 'growth', 'scale', 'enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.brand_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null,
  industry text,
  website text,
  gstin text,
  subscription_tier subscription_tier not null default 'starter',
  subscription_status subscription_status not null default 'none',
  razorpay_customer_id text,
  razorpay_subscription_id text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_brand_profiles_updated_at on public.brand_profiles;
create trigger trg_brand_profiles_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();
