-- Creator onboarding fields (spec §3 creator_profiles, §6 field list).
-- Enumerated array fields use CHECK (col <@ array[...]) instead of a
-- separate lookup-table-per-field so the schema stays close to the spec's
-- flat field list while still rejecting invalid values at the DB layer.

create table if not exists public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  instagram_url text,
  youtube_url text,
  other_social_url text,
  portfolio_files jsonb not null default '[]', -- [{storage_path, public_url, file_name, size_bytes}]

  content_categories text[] not null default '{}'
    check (content_categories <@ array[
      'Fashion','Beauty','Food','Travel','Fitness','Tech','Education',
      'Entertainment','Finance','Gaming','Motivation','Comedy','Photography','UGC','Other'
    ]),

  audience_type text[] not null default '{}'
    check (audience_type <@ array[
      'Students','Working Professionals','Entrepreneurs','Creators','Homemakers','Mixed','Other'
    ]),

  creator_status text
    check (creator_status in ('Full-time','Part-time/Side Hustler','Aspiring','Professional-with-presence')),

  content_experience text
    check (content_experience in ('Less than 6mo','6mo-1yr','1-2yr','2+yr')),

  content_formats text[] not null default '{}'
    check (content_formats <@ array[
      'Reels','Posts','Stories','Product Reviews','UGC Videos','Unboxing',
      'Event Coverage','Brand Promotion','YouTube Videos','Other'
    ]),

  instagram_followers_range text
    check (instagram_followers_range in ('Below 1K','1K-10K','10K-50K','50K-100K','100K-500K','500K+')),

  avg_reel_views_range text
    check (avg_reel_views_range in ('Below 1K','1K-5K','5K-10K','10K-50K','50K-100K','100K+')),

  opportunity_interests text[] not null default '{}'
    check (opportunity_interests <@ array[
      'Brand Collabs','Paid Opportunities','Barter Deals','Networking','Creator Events',
      'Product Gifting','Exposure to Big Brands','Learning & Growth','Long Term Partnerships'
    ]),

  collab_types_open_to text[] not null default '{}'
    check (collab_types_open_to <@ array[
      'Paid','Barter','Product Gifting','Event Collabs','Affiliate','Long Term','UGC Projects'
    ]),

  contact_ok_bool boolean not null default true,
  event_interest_enum text check (event_interest_enum in ('Yes','No','Maybe')),
  paid_barter_interest_enum text check (paid_barter_interest_enum in ('Yes','Maybe','No')),

  why_join text,

  rating_avg numeric default 0,
  rating_count integer not null default 0,
  campaigns_completed_count integer not null default 0,

  -- Razorpay Route linked account for escrow payouts (spec §7 step 3).
  -- Populated by a separate payout-account onboarding flow; until it's
  -- set, escrow releases fall back to a manual payout queue.
  razorpay_linked_account_id text,

  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_creator_profiles_updated_at on public.creator_profiles;
create trigger trg_creator_profiles_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();
