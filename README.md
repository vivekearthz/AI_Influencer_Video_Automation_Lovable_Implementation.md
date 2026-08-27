# AI Video Studio — Influencer Video Automation & 24-Channel Social Publishing

A provider-agnostic engine that turns a campaign brief into a finished AI
talking-presenter video, WhatsApp/email campaign assets, and a
scheduled/published package across up to 24 social channels.

Implements the specification in
[`docs/AI_Influencer_Video_Automation_Lovable_Implementation.md`](docs/AI_Influencer_Video_Automation_Lovable_Implementation.md).

> **This branch (`main`) also hosts a second, unrelated app: InfluenceOS**
> (a creator/brand marketplace — see [`influenceos/README.md`](influenceos/README.md)),
> nested under `influenceos/` so both apps can coexist on one branch. This
> app (AI Video Studio) is the one at the repo root. See "Working with
> Lovable" below for what that means for Lovable syncing.

```
Campaign Brief → AI Script → Presenter/Scene Planner → Video Provider Selection
→ Video Generation Queue → Voice/Native Audio → Brand Overlay (FFmpeg)
→ Quality Control → Platform Captions → WhatsApp → Email
→ 24-Channel Publishing Router → Official API / Approved Publisher / Human Approval
→ Publishing + Status + Analytics
```

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix primitives) + React Query + React Router
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions/Deno)
- **Rendering:** a small standalone Node/FFmpeg worker (`workers/render-worker`) for brand overlay + subtitle burn-in, since Edge Functions can't shell out to `ffmpeg`
- **AI providers (pluggable, never hard-coded):** Gemini (script/captions/QC/images), Veo 3.1 (video), ElevenLabs (voice) — swap or add providers from the `ai_providers` / `ai_models` tables without redeploying

## Repository layout

```
src/                      React app
  components/ui/          shadcn/ui primitives
  components/layout/      App shell (sidebar, topbar, protected routes)
  components/ai-video/    Campaign pipeline/channel status widgets
  components/studio/      Shared page chrome (headers, status badges)
  context/                Auth + Workspace React contexts
  hooks/                  React Query hooks (campaigns, providers, social, costs...)
  pages/                  Route-level pages (studio/*, settings/*, auth)
  services/                Provider-agnostic types/scoring shared with the Edge Functions
  types/database.ts       Hand-written mirror of the Supabase schema

supabase/
  migrations/             Every table, RLS policy, and seed data (numbered, spec §69)
  functions/              Edge Functions (Deno) — one per spec §47 endpoint, plus campaign-orchestrator
    _shared/               Provider clients, router, cost controller, audit log, idempotency
  cron/                   pg_cron setup script + README comparing cron mechanisms

.github/workflows/        GitHub Actions cron alternative for campaign-orchestrator
workers/render-worker/    Standalone Node + FFmpeg service for video assembly
docs/                     Original implementation specifications (this app + InfluenceOS)
influenceos/              A second, unrelated app (creator/brand marketplace) — see influenceos/README.md
```

## Getting started

### 1. Frontend

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

### 2. Supabase project

1. Create a Supabase project (or use the Supabase CLI locally: `supabase start`).
2. Run every file in `supabase/migrations/` in order (via `supabase db push`,
   the SQL editor, or your CI/CD of choice). They create:
   - the multi-tenant workspace model (`workspaces`, `workspace_members`, `profiles`)
   - the AI provider/model registry (`ai_providers`, `ai_provider_credentials`, `ai_models`)
   - the campaign pipeline (`campaigns`, `campaign_assets`, `ai_generation_jobs`)
   - the 24-channel social layer (`platform_catalog`, `social_accounts`, `social_publish_jobs`, `social_post_metrics`)
   - WhatsApp/email campaigns, the human approval queue, cost ledger, audit log, A/B test variants
   - Row Level Security on every workspace-scoped table
   - seed data for providers/models and the 24-channel platform catalog
   - the storage buckets used for presenters/raw video/rendered video/subtitles/etc.
3. Deploy the Edge Functions in `supabase/functions/*` with the Supabase CLI:
   ```bash
   supabase functions deploy script-generate presenter-generate video-generate \
     video-status video-render video-qc caption-generate campaign-create \
     campaign-approve social-publish social-health-check provider-health-check \
     campaign-status whatsapp-send email-send campaign-orchestrator \
     webhooks-social webhooks-whatsapp webhooks-email webhooks-ai
   ```
   `campaign-orchestrator` and the four `webhooks-*` functions are configured
   with `verify_jwt = false` in `supabase/config.toml` since they're called
   by cron/third parties rather than a logged-in user; they authenticate
   themselves instead (a shared secret for the orchestrator, HMAC signatures
   for webhooks).
4. Set Edge Function secrets for whichever providers you actually use (never
   commit these, never prefix with `VITE_`):
   ```bash
   supabase secrets set GEMINI_API_KEY=... ELEVENLABS_API_KEY=... \
     WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... \
     EMAIL_PROVIDER_KEY=... EMAIL_FROM_ADDRESS=... \
     ORCHESTRATOR_CRON_SECRET=$(openssl rand -hex 32)
   ```
   See `.env.example` for the full list. A provider only becomes usable once
   its secret is present — the Providers page runs a live health check and
   never assumes a provider works just because it's enabled in the UI.

### 3. Render worker (FFmpeg)

Deploy `workers/render-worker` (Docker image included) to any always-on
container host. See `workers/render-worker/README.md`.

### 4. Automatic pipeline advancement (cron)

A campaign doesn't advance itself just by existing — something needs to
call `campaign-orchestrator` on a timer so script → presenter → video →
render → QC → captions happen automatically, and approved/scheduled
campaigns actually get published at the right time without anyone clicking
through the UI. See **`supabase/cron/README.md`** for three ways to wire
this up (pg_cron + pg_net from inside Postgres, a GitHub Actions workflow
already included at `.github/workflows/campaign-orchestrator-cron.yml`, or
any external HTTP cron pinger) — pick whichever fits your environment.

## Security & compliance guardrails baked in

- **No password automation.** Social publishing only ever uses official
  OAuth APIs, an approved third-party publisher, or a human approval queue —
  never stored passwords or CAPTCHA/MFA bypass (spec §2, §11, §15, §64).
- **Secrets stay server-side.** All provider API keys live in Supabase Edge
  Function secrets, never in `VITE_`-prefixed variables or any client-read
  table (spec §49).
- **RLS everywhere.** Every workspace-scoped table enforces membership via
  `is_workspace_member()` / `is_workspace_admin()` (spec §50).
- **Idempotent jobs.** Every generation and publish job carries a
  deterministic `idempotency_key` so retries and duplicate webhooks can't
  double-charge or double-post (spec §33).
- **Cost guardrails + kill switch.** Per-workspace max cost/video, daily and
  monthly spend caps, and an emergency "pause everything" panel live under
  Settings (spec §53, §74).
- **Mandatory human review.** Financial/medical/legal claims, celebrity
  likeness, and unverified claims automatically route to the approval queue
  instead of auto-publishing (spec §38, §67-68).

## Notes for whoever picks this up in Lovable

- The AI Video Studio UI lives under `/studio/*` and is intentionally built
  with shadcn/ui + Tailwind so Lovable can regenerate/restyle components
  without touching the underlying Supabase queries in `src/hooks/*`.
- Provider/model swaps (e.g. a cheaper Veo tier, a new avatar provider)
  happen entirely in the `ai_providers` / `ai_models` tables — no UI or
  Edge Function code changes required.
- Adding a 25th social channel is a `platform_catalog` insert, not a code
  change; native adapters live in `supabase/functions/_shared/social/*` if
  you want to add a bespoke integration for it later.

## Working with Lovable

Lovable's GitHub sync only ever edits and syncs **one branch at a time**
per project, and treats the repository root as "the project" (it can't
run an app that lives in a subdirectory). Both matter here because this
repo now hosts two apps:

- **AI Video Studio** (this one) — lives at the repo **root** on `main`.
  A Lovable project synced to `main` (Lovable's default branch) will pick
  this app up correctly.
- **InfluenceOS** — lives under `influenceos/` on `main`, so it is **not**
  directly usable by a Lovable project synced to `main` (Lovable won't
  look inside a subfolder). To run InfluenceOS as its own Lovable project,
  point that project's GitHub branch picker at
  `cursor/influenceos-marketplace-root-d753` instead, which has
  InfluenceOS at the repo root. (**Settings → GitHub** in the Lovable
  project → branch picker → select that branch; enable **Account Settings
  → Labs → GitHub Branch Switching** first if the picker isn't visible.)

Going forward, all Cursor updates for this app are pushed straight to
`main` (the branch this Lovable project already syncs), so there's no more
branch mismatch between Cursor and Lovable for this app. InfluenceOS
updates go to `cursor/influenceos-marketplace-root-d753` for the same
reason, kept in sync with the copy under `influenceos/` on `main`.

### If Lovable's GitHub connection breaks (404 on reconnect)

See [`docs/integration-connections.md`](docs/integration-connections.md) for:

- the full ledger of which app syncs to which branch and Supabase project,
- why a persistent 404 when reconnecting happens (stale repo reference,
  revoked/uninstalled GitHub App access, org SSO enforcement, or a
  Lovable-side bug) and the exact manual steps to clear each cause, and
- [`.github/workflows/sync-health-selfheal.yml`](.github/workflows/sync-health-selfheal.yml),
  a scheduled monitor (`scripts/check-sync-health.mjs`) that watches for the
  GitHub-side symptoms of a broken sync — a missing sync branch, or an app's
  files disappearing from the root of its branch — with retries and a
  self-resetting tracking issue, so a break is caught immediately even
  though re-authorizing Lovable's GitHub App is always a manual, one-time
  step that only an account owner can complete.
