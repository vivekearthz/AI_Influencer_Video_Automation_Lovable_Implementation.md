-- -----------------------------------------------------------------------------
-- One-time setup: schedule the campaign-orchestrator Edge Function to run
-- every minute via pg_cron + pg_net (spec §32, §35).
--
-- This is intentionally NOT a numbered migration: it embeds your project's
-- URL and a secret, which differ per environment (dev/staging/prod) and
-- should never be committed as plaintext into version control. Run it once
-- per Supabase project after deploying the Edge Functions, either via the
-- SQL editor in the Supabase dashboard or `supabase db execute -f`.
--
-- Prerequisites:
--   1. Deploy the Edge Functions (see README.md).
--   2. Set the ORCHESTRATOR_CRON_SECRET Edge Function secret:
--        supabase secrets set ORCHESTRATOR_CRON_SECRET=$(openssl rand -hex 32)
--   3. Replace the two placeholders below with your real project ref and the
--      SAME secret value you set in step 2, then run this file.
-- -----------------------------------------------------------------------------

select cron.schedule(
  'campaign-orchestrator-sweep',
  '* * * * *', -- every minute; widen to e.g. '*/5 * * * *' if you want fewer sweeps
  $$
  select net.http_post(
    url := 'https://__YOUR_PROJECT_REF__.supabase.co/functions/v1/campaign-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '__YOUR_ORCHESTRATOR_CRON_SECRET__'
    ),
    body := jsonb_build_object('trigger', 'pg_cron')
  ) as request_id;
  $$
);

-- To inspect scheduled jobs:
--   select * from cron.job;
-- To inspect recent run history:
--   select * from cron.job_run_details order by start_time desc limit 20;
-- To remove the schedule:
--   select cron.unschedule('campaign-orchestrator-sweep');
