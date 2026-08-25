-- Post-collaboration ratings (spec §3 reviews).

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  ratee_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (collaboration_id, rater_id)
);

create index if not exists idx_reviews_ratee on public.reviews(ratee_id);

-- Keep creator_profiles.rating_avg / rating_count in sync whenever a review
-- targets a creator, so the discovery/search UI can sort by rating without
-- an aggregate query on every page load.
create or replace function public.refresh_creator_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.creator_profiles cp
  set rating_count = agg.rating_count,
      rating_avg = agg.rating_avg
  from (
    select ratee_id, count(*) as rating_count, avg(rating)::numeric(3,2) as rating_avg
    from public.reviews
    where ratee_id = coalesce(new.ratee_id, old.ratee_id)
    group by ratee_id
  ) as agg
  where cp.user_id = agg.ratee_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_refresh_creator_rating on public.reviews;
create trigger trg_reviews_refresh_creator_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_creator_rating();
