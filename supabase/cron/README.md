# Automatic campaign pipeline advancement

Nothing in the AI Video Studio pipeline requires a human to click through
every step. Once a campaign is created, `campaign-orchestrator`
(`supabase/functions/campaign-orchestrator`) sweeps all in-progress
campaigns and calls whichever step is next — script → presenter → video →
render → QC → captions — and, once a human has clicked **Approve & Schedule
All**, automatically publishes at the scheduled time (or immediately, if no
schedule was set). It never auto-retries a step a human needs to review
(QC failures, mandatory-review flags, publish failures) — see
`supabase/functions/campaign-orchestrator/index.ts` for the exact state
machine.

Something has to actually call that function on a timer. Pick **one** of
the following (they're not mutually exclusive, but one is enough):

## Option A — pg_cron + pg_net (recommended, no extra infra)

Runs entirely inside your Supabase Postgres instance.

1. Deploy the Edge Functions (see root `README.md`).
2. Set the shared secret used to authenticate cron requests:
   ```bash
   supabase secrets set ORCHESTRATOR_CRON_SECRET=$(openssl rand -hex 32)
   ```
3. Run `supabase/cron/schedule_orchestrator.sql` once (SQL editor or
   `supabase db execute -f supabase/cron/schedule_orchestrator.sql`) after
   filling in your project ref and the same secret from step 2.
4. The `pg_cron`/`pg_net` extensions are enabled automatically by
   `supabase/migrations/20260824000028_cron_extensions.sql` if your plan
   supports them. If that migration logged a notice instead of enabling
   them (some free-tier / self-hosted setups restrict `pg_cron`), enable
   them from the dashboard (**Database → Extensions**) or use Option B.

## Option B — GitHub Actions (works anywhere, no pg_cron needed)

`.github/workflows/campaign-orchestrator-cron.yml` calls the same endpoint
on a 5-minute schedule using `curl`. Add these two repository secrets
(**Settings → Secrets and variables → Actions**):

- `SUPABASE_PROJECT_URL` — e.g. `https://your-project-ref.supabase.co`
- `ORCHESTRATOR_CRON_SECRET` — the same value you set as an Edge Function secret

That's it — GitHub runs the workflow on schedule with no other
infrastructure required. You can also trigger it manually from the Actions
tab (`workflow_dispatch`) to test it immediately after deploying.

## Option C — any external HTTP cron pinger

Since triggering a sweep is just one authenticated HTTP request, you can
point *any* scheduler at it instead — Vercel Cron, cron-job.org, EasyCron,
a Kubernetes CronJob, a systemd timer, etc.:

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/campaign-orchestrator" \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $ORCHESTRATOR_CRON_SECRET" \
  -d '{"trigger":"external-cron"}'
```

## What still requires the render worker

Rendering (FFmpeg brand overlay + subtitles) is handled by
`workers/render-worker`, a small always-on Node process — see its own
README. The orchestrator only *queues* the render job; the worker process
itself picks up queued jobs via its own continuous poll loop, so it does
not need a separate cron trigger.
