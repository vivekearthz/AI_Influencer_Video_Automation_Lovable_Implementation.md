-- Brand <-> creator collaboration (spec §3 collaborations, §7-8).

do $$ begin
  create type collaboration_status as enum (
    'invited', 'negotiating', 'accepted', 'content_submitted', 'approved', 'paid', 'disputed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type escrow_status as enum ('none', 'held', 'released', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  brand_id uuid not null references public.brand_profiles(user_id) on delete cascade,

  status collaboration_status not null default 'invited',
  agreed_amount numeric,
  usage_rights_terms text,
  usage_rights_duration_days integer, -- explicit duration required; never "unlimited forever" by default (spec §8)

  contract_pdf_url text,
  disclosure_clause_generated_bool boolean not null default false,

  escrow_payment_id text,
  escrow_status escrow_status not null default 'none',
  escrow_amount numeric,

  content_delivery_url text,

  dispute_reason text,
  dispute_raised_by uuid references auth.users(id) on delete set null,
  dispute_raised_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collaborations_campaign on public.collaborations(campaign_id);
create index if not exists idx_collaborations_creator on public.collaborations(creator_id);
create index if not exists idx_collaborations_brand on public.collaborations(brand_id);
create index if not exists idx_collaborations_status on public.collaborations(status);

drop trigger if exists trg_collaborations_updated_at on public.collaborations;
create trigger trg_collaborations_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();
