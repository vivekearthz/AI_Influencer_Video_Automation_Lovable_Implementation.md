# InfluenceOS

A two-sided, escrow-protected marketplace connecting creators (free) and
brands (paid subscription), with auto-generated, ASCI/DPDP-compliant
contracts on every collaboration. Implements
[`docs/InfluenceOS-Implementation.md`](docs/InfluenceOS-Implementation.md).

```
Brand searches/filters creators → shortlists → sends collab offer
  → creator accepts/negotiates → contract auto-generated
  → (if paid) funds held in escrow → content delivered
  → brand approves → escrow released → both sides rate each other
```

> **Branch layout note:** this app lives at the repository root on this
> branch (`cursor/influenceos-marketplace-d753`) so it can be synced
> directly by a Lovable project's GitHub branch picker. A separate,
> unrelated product — **AI Influencer Video Automation & 24-Channel Social
> Publishing** — is implemented the same way on
> `cursor/ai-influencer-video-automation-d753` / its PR. Each app should be
> connected to its **own** Lovable project synced to its own branch (see
> "Working with Lovable" below) — Lovable only ever edits/syncs one branch
> of one repo at a time, so trying to serve both apps from one Lovable
> project/branch won't work.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Query + React Router
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions/Deno)
- **Payments:** Razorpay (subscriptions for brands, escrow payment links + Route payouts for creators)
- **Contracts:** auto-generated PDF (via `pdf-lib`) with an explicit usage-rights window and an ASCI-compliant disclosure clause

## Repository layout

```
src/
  components/ui/          shadcn/ui primitives
  components/layout/      Public marketing shell + authenticated app shell (role-aware sidebar)
  components/onboarding/  Multi-select fields + step indicator for the creator wizard
  components/collaboration/ Message thread for the collaboration workspace
  context/AuthContext.tsx Auth + profile (role: creator/brand/admin)
  hooks/                   React Query hooks per domain (creator/brand profile, campaigns,
                           collaborations, messages, reviews, creator search, admin)
  pages/
    public/                /, /for-creators, /for-brands, /pricing, /trust-and-compliance, /faq
    auth/                  /login, /signup (role selector + 18+ certification)
    onboarding/             /onboarding/creator (4-step wizard), /onboarding/brand
    creator/                /dashboard/creator, .../collaborations, .../profile
    brand/                  /dashboard/brand, .../discover, .../campaigns, .../billing, /campaign/new
    shared/                 /creator/:id, /collaboration/:id (messages, contract, escrow, reviews)
    admin/                  /admin, /admin/users, /admin/disputes
  types/database.ts        Hand-written mirror of the Supabase schema

supabase/
  migrations/              profiles (role enum), consent_logs, creator_profiles, brand_profiles,
                           campaigns, collaborations, messages, reviews, RLS, storage buckets
  functions/               contract-generate, escrow-fund, escrow-release, dispute-resolve,
                           razorpay-subscription-checkout, razorpay-webhook

docs/                      Original implementation specifications (this app + the AI Video Studio one)
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

### Supabase project

1. Run every file in `supabase/migrations/` in order.
2. Deploy the Edge Functions:
   ```bash
   supabase functions deploy contract-generate escrow-fund escrow-release \
     dispute-resolve razorpay-subscription-checkout razorpay-webhook
   ```
3. Set secrets (see `.env.example`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, and one `RAZORPAY_PLAN_ID_*` per subscription
   tier. Point Razorpay's webhook configuration at
   `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`.
4. Promote a user to admin once you have one: `update public.profiles set role = 'admin' where email = '...';`

## Working with Lovable (branches, not just `main`)

Lovable's GitHub sync only ever edits and syncs **one branch at a time**,
and defaults to the repository's default branch (usually `main`). It does
**not** automatically watch or pick up other branches — that's true for
every Lovable project, not something specific to this repo. If a Lovable
project only ever shows/commits to `main` and never reflects work pushed to
a branch like this one, that's expected until one of the following happens:

- **Merge this branch's PR into `main`.** Once merged, the next sync (or
  reopening the Lovable project) picks up the new commits on `main`
  automatically. This is the simplest option if you only want one Lovable
  project for one app.
- **Point a Lovable project at this branch directly**, without merging:
  in that Lovable project, go to **Settings → GitHub**, use the branch
  picker, and select `cursor/influenceos-marketplace-d753`. Lovable
  immediately switches to editing/syncing that branch instead of `main`.
  (If you don't see a branch picker, enable it first under **Account
  Settings → Labs → GitHub Branch Switching**.)

Because this repo hosts **two different apps on two different branches**,
the second option needs **two separate Lovable projects** connected to
this same GitHub repository — one synced to `main` (or this branch) for
InfluenceOS, and a second Lovable project synced to
`cursor/ai-influencer-video-automation-d753` (or wherever that app ends up
after merging) for the AI Video Studio app. A single Lovable project can't
serve both at once since it only tracks one branch, and each app expects
its own files at the repo root.

## What's intentionally left as a follow-up

- **Razorpay Route payout onboarding** for creators (linking a payout
  account) is a separate, merchant-specific KYC flow not wired into the UI
  yet — `creator_profiles.razorpay_linked_account_id` is where it plugs in.
  Until it's set, escrow releases fall back to a manual payout queue
  exactly as the spec allows ("manual payout queue for MVP if Route isn't
  yet configured").
- **Prerendering the marketing pages** (`/`, `/for-creators`, `/for-brands`,
  `/pricing`, `/trust-and-compliance`, `/faq`) for full crawlability by
  non-JS-executing AI crawlers — currently they're client-rendered with
  `document.title`/meta/JSON-LD injected via `src/components/seo/Seo.tsx`,
  which works for crawlers that execute JavaScript (Googlebot) but not all
  of them. Consider `vite-react-ssg` or a small prerender build step.
- **Contract PDF signed URLs** are issued with a 5-year expiry at
  generation time rather than freshly signed on each view — fine for an
  MVP, but a dedicated "get contract" function that mints a fresh
  short-lived signed URL on demand is the more robust long-term design.
