-- Brand campaigns (spec §3 campaigns).

do $$ begin
  create type campaign_budget_type as enum ('paid', 'barter', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'open', 'in_review', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_profiles(user_id) on delete cascade,
  title text not null,
  brief text,
  category text,
  budget_type campaign_budget_type not null default 'paid',
  budget_amount numeric,
  target_creator_tiers text[] not null default '{}'
    check (target_creator_tiers <@ array['Below 1K','1K-10K','10K-50K','50K-100K','100K-500K','500K+']),
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_brand on public.campaigns(brand_id);
create index if not exists idx_campaigns_status on public.campaigns(status);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();
