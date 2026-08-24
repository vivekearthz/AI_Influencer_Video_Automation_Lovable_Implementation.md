-- Normalized analytics (spec §61). Not every platform exposes every metric,
-- hence every column besides the identifiers is nullable.

create table if not exists public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  publish_job_id uuid not null references public.social_publish_jobs(id) on delete cascade,
  impressions integer,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  clicks integer,
  followers_gained integer,
  watch_time_seconds numeric,
  completion_rate numeric,
  fetched_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'
);

create index if not exists idx_social_post_metrics_job on public.social_post_metrics(publish_job_id);
