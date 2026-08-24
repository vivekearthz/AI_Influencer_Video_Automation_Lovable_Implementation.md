# InfluenceOS

A two-sided marketplace connecting **creators** (free) and **brands** (paid
subscription), with escrow-protected payments and auto-generated,
ASCI/DPDP-compliant contracts on every collaboration.

> This repository previously held only the implementation specification.
> This branch/PR adds the actual implementation, kept in `influenceos/` as
> a self-contained app (its own `package.json`, Supabase project, and
> Edge Functions) so it can be deployed independently — see
> [`influenceos/README.md`](influenceos/README.md) for setup instructions.

```
Brand searches/filters creators → shortlists → sends collab offer
  → creator accepts/negotiates → contract auto-generated
  → (if paid) funds held in escrow → content delivered
  → brand approves → escrow released → both sides rate each other
```

## Quick start

```bash
cd influenceos
npm install
cp .env.example .env   # fill in your Supabase project URL/anon key
npm run dev
```

Then follow **`influenceos/README.md`** to set up the Supabase project
(migrations, Edge Functions, Razorpay secrets).

## Specification

The full spec this implements lives in
[`docs/InfluenceOS-Implementation.md`](docs/InfluenceOS-Implementation.md).

## Note

A separate, unrelated product spec — **AI Influencer Video Automation &
24-Channel Social Publishing** — is implemented on a different branch/PR in
this same repository (a video-generation/publishing automation tool, not
part of the InfluenceOS marketplace). See
[`docs/AI_Influencer_Video_Automation_Lovable_Implementation.md`](docs/AI_Influencer_Video_Automation_Lovable_Implementation.md)
for that spec.
