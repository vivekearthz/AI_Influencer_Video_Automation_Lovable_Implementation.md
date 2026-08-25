-- -----------------------------------------------------------------------------
-- Enable pg_cron + pg_net so the campaign orchestrator can be scheduled
-- entirely from Postgres (spec §32 "Supabase PostgreSQL + pg_cron + queue
-- table"). Wrapped in exception handlers because pg_cron is only available
-- on some Supabase plans / self-hosted setups — if it can't be enabled here,
-- use the GitHub Actions workflow in .github/workflows/ instead (see
-- supabase/cron/README.md for both options).
-- -----------------------------------------------------------------------------

do $$
begin
  create extension if not exists pg_cron;
exception when insufficient_privilege or feature_not_supported then
  raise notice 'pg_cron could not be enabled automatically. Enable it from the Supabase dashboard (Database > Extensions) or use the GitHub Actions cron alternative instead.';
end $$;

do $$
begin
  create extension if not exists pg_net;
exception when insufficient_privilege or feature_not_supported then
  raise notice 'pg_net could not be enabled automatically. Enable it from the Supabase dashboard (Database > Extensions) or use the GitHub Actions cron alternative instead.';
end $$;
