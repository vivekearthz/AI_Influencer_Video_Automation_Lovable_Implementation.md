# InfluenceOS

A two-sided, escrow-protected marketplace connecting creators (free) and
brands (paid subscription), with auto-generated, ASCI/DPDP-compliant
contracts on every collaboration. Implements
[`../docs/InfluenceOS-Implementation.md`](../docs/InfluenceOS-Implementation.md).

```
Brand searches/filters creators → shortlists → sends collab offer
  → creator accepts/negotiates → contract auto-generated
  → (if paid) funds held in escrow → content delivered
  → brand approves → escrow released → both sides rate each other
```

> **Why this app lives in a subfolder here:** this repository's `main`
> branch also hosts a second, unrelated app (AI Influencer Video
> Automation) at the repo root. Since a Lovable project can only sync one
> branch and treats the repo root as "the project," these two apps can't
> both be root-level on the same branch — so InfluenceOS lives here, under
> `influenceos/`, on `main`. If you want to run/deploy InfluenceOS as its
> own root-level Lovable project instead, use the dedicated
> `cursor/influenceos-marketplace-root-d753` branch, which has this same
> app at the repo root.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Query + React Router
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions/Deno)
- **Payments:** Razorpay (subscriptions for brands, escrow payment links + Route payouts for creators)
- **Contracts:** auto-generated PDF (via `pdf-lib`) with an explicit usage-rights window and an ASCI-compliant disclosure clause

## Repository layout

```
influenceos/
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
```

## Getting started

```bash
cd influenceos
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

InfluenceOS uses its **own, separate Supabase project** from the AI Video
Automation app at the repo root — they are two different products with two
different database schemas.

### Supabase project

1. Run every file in `influenceos/supabase/migrations/` in order.
2. Deploy the Edge Functions:
   ```bash
   cd influenceos
   supabase functions deploy contract-generate escrow-fund escrow-release \
     dispute-resolve razorpay-subscription-checkout razorpay-webhook
   ```
3. Set secrets (see `.env.example`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, and one `RAZORPAY_PLAN_ID_*` per subscription
   tier. Point Razorpay's webhook configuration at
   `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`.
4. Promote a user to admin once you have one: `update public.profiles set role = 'admin' where email = '...';`

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
