# InfluenceOS — Implementation Spec (for Lovable.dev)
Target deployment: Innovexsis / MarTech Investis portal, subdomain or path `/influenceos`
Backend: same Supabase/Razorpay backend already used by DareToLaw and PaylaStep (reuse auth + payments where possible)

---

## 1. Product Summary

A two-sided marketplace web app with three user roles:
- **Creator** (free account)
- **Brand** (paid subscription account)
- **Admin** (internal — Innovexsis team)

Core loop: Brand searches/filters creators → shortlists → sends collab offer → creator accepts/negotiates → contract auto-generated → (if paid) funds held in escrow → content delivered → brand approves → escrow released → both sides rate each other.

---

## 2. Tech Stack Notes

- Frontend: React (Lovable.dev default), Tailwind, shadcn/ui
- Auth: Email/OTP + Google OAuth (reuse existing Innovexsis auth provider if available)
- Database: Postgres (Supabase) — schema below
- Payments: Razorpay (escrow via Razorpay Route/linked accounts, or hold-and-release via Razorpay Payment Links + manual release trigger if Route unavailable)
- File storage: Supabase Storage for portfolio uploads (images/video, max 100MB/file, 5 files)
- Contract generation: pull from same document-generation engine used in the Startup Legal Kit service — output PDF via same PDF pipeline

---

## 3. Database Schema (core tables)

```
users
  id, role (creator|brand|admin), email, phone, full_name, city, created_at, verified_bool

creator_profiles
  user_id (fk), instagram_url, youtube_url, other_social_url, portfolio_files[],
  content_categories[] (Fashion, Beauty, Food, Travel, Fitness, Tech, Education,
    Entertainment, Finance, Gaming, Motivation, Comedy, Photography, UGC, Other),
  audience_type[] (Students, Working Professionals, Entrepreneurs, Creators,
    Homemakers, Mixed, Other),
  creator_status (Full-time, Part-time/Side Hustler, Aspiring, Professional-with-presence),
  content_experience (Less than 6mo, 6mo-1yr, 1-2yr, 2+yr),
  content_formats[] (Reels, Posts, Stories, Product Reviews, UGC Videos,
    Unboxing, Event Coverage, Brand Promotion, YouTube Videos, Other),
  instagram_followers_range (Below 1K, 1K-10K, 10K-50K, 50K-100K, 100K-500K, 500K+),
  avg_reel_views_range (Below 1K, 1K-5K, 5K-10K, 10K-50K, 50K-100K, 100K+),
  opportunity_interests[] (Brand Collabs, Paid Opportunities, Barter Deals,
    Networking, Creator Events, Product Gifting, Exposure to Big Brands,
    Learning & Growth, Long Term Partnerships),
  collab_types_open_to[] (Paid, Barter, Product Gifting, Event Collabs,
    Affiliate, Long Term, UGC Projects),
  contact_ok_bool, event_interest_enum (Yes/No/Maybe),
  rating_avg, campaigns_completed_count

brand_profiles
  user_id (fk), company_name, industry, website, gstin (optional),
  subscription_tier (starter|growth|scale|enterprise), subscription_status,
  razorpay_customer_id

campaigns
  id, brand_id (fk), title, brief, category, budget_type (paid|barter|hybrid),
  budget_amount, target_creator_tiers[], status (draft|open|in_review|closed)

collaborations
  id, campaign_id (fk), creator_id (fk), brand_id (fk),
  status (invited|negotiating|accepted|content_submitted|approved|paid|disputed|cancelled),
  agreed_amount, usage_rights_terms, contract_pdf_url,
  escrow_payment_id, escrow_status (held|released|refunded),
  content_delivery_url, disclosure_clause_generated_bool

messages
  id, collaboration_id (fk), sender_id, body, created_at

reviews
  id, collaboration_id (fk), rater_id, ratee_id, rating (1-5), comment
```

---

## 4. Pages / Routes

### Public marketing pages
- `/` — InfluenceOS landing page (see §5 for copy structure)
- `/for-creators` — creator-side value prop page
- `/for-brands` — brand-side value prop + pricing table
- `/pricing` — full tier comparison (from strategy doc §6)
- `/trust-and-compliance` — escrow, ASCI/DPDP compliance explainer (this is the key differentiation page vs. ScaleFox/Qoruz)
- `/faq` — structured Q&A, marked up with FAQPage schema for AEO

### App (authenticated)
- `/signup` — role selector (Creator / Brand), then routed form
- `/onboarding/creator` — multi-step form (reuse field list from schema above; mirror the ScaleFox reference form's field set but as a native multi-step wizard, not a Google Form redirect)
- `/onboarding/brand` — company details + subscription tier selection + Razorpay checkout
- `/dashboard/creator` — profile status, active collaborations, messages, earnings (if paid), rating
- `/dashboard/brand` — creator discovery/search with filters (category, audience, follower range, reel views, city, collab type), campaign management, escrow status
- `/creator/:id` — public-ish creator profile card (visible to logged-in brands only)
- `/campaign/new` — campaign creation wizard (brand side)
- `/collaboration/:id` — shared workspace: messages, contract, delivery upload, approval, escrow release button
- `/admin` — internal moderation, dispute resolution, subscription management

---

## 5. Landing Page (`/`) Copy Structure

```
Hero:
  H1: "Where Creators and Brands Actually Trust Each Other"
  Sub: "Free for creators. Compliant, escrow-protected campaigns for brands.
        No spreadsheets, no ghosting, no unpaid usage rights."
  CTA buttons: [I'm a Creator — Join Free] [I'm a Brand — Start a Campaign]

Section: "The problem with influencer marketing today"
  - 3-column pain point cards (creator visibility / brand discovery+ROI /
    trust & compliance gaps) — pull stats from strategy doc §4

Section: "How InfluenceOS is different"
  - Two-way self-serve marketplace (not a form-to-agency funnel)
  - Escrow-backed payments
  - Auto-generated, ASCI/DPDP-compliant contracts
  - AI-assisted creator matching by engagement quality, not follower count
  - Startup-friendly pricing (no ₹3-5L campaign minimums)

Section: "For Creators" (link to /for-creators)
  - Free forever, get discovered, get paid on time, know your rights

Section: "For Brands" (link to /for-brands)
  - Pricing snapshot (3 tiers + "Talk to us" for Enterprise)

Section: Social proof / logos (placeholder until launch data exists)

Footer CTA + FAQ schema block
```

---

## 6. Creator Onboarding Form — Field List (build as in-app wizard, not external form)

Reuse the field set observed in the reference competitor form, restructured as InfluenceOS's own native flow:

1. Full Name*, Email*, WhatsApp/Contact Number*, City*
2. Instagram Profile Link*, YouTube Profile Link, Other Social Profile
3. Portfolio upload (up to 5 files, 100MB each)
4. Content categories (multi-select)*
5. Audience type (multi-select)*
6. Creator status (single-select)
7. Time creating content (single-select)*
8. Content formats comfortable creating (multi-select)*
9. Instagram follower range*
10. Average Reel reach/views*
11. Opportunity types interested in (multi-select)
12. Collab types open to (multi-select)*
13. Interested in exclusive creator events? (Yes/No/Maybe)*
14. Interested in paid/barter opportunities? (Yes/Maybe/No)*
15. Comfortable being contacted re: brand collabs/events/campaigns/barter? (Yes/No)
16. Why join InfluenceOS? (open text)
17. Confirmation checkbox: information accurate, consent to DPDP-compliant data processing, agree to be considered for InfluenceOS opportunities

*Required fields marked. Do not collect date of birth or any field that could reveal a minor is signing up — add an 18+ self-certification checkbox instead, and block signup below that.

---

## 7. Brand Subscription & Escrow Flow (Razorpay)

1. Brand selects tier at `/onboarding/brand` → Razorpay Subscriptions API creates recurring billing.
2. On campaign creation with a paid budget, brand funds a Razorpay Payment Link/Route transaction into a holding state tagged to the `collaborations.escrow_payment_id`.
3. On brand's "Approve Delivery" action, trigger release transfer to creator's linked payout account (Razorpay Route linked account, or manual payout queue for MVP if Route isn't yet configured).
4. Dispute path: either party can flag `status = disputed`; funds stay held; routes to `/admin` for manual resolution.

---

## 8. Contract & Compliance Auto-Generation

- On `collaboration.status = accepted`, auto-generate a PDF contract using the same document-generation pipeline built for the Startup Legal Kit service, populated with: parties, deliverables, timeline, agreed amount, usage rights window (default: request explicit duration, never "unlimited forever" as default), and an ASCI-compliant disclosure clause template.
- Store consent + data-processing notice per DPDP Act requirements at signup (link to `/trust-and-compliance` page); log consent timestamp per user.

---

## 9. SEO / AEO Technical Requirements

- Server-rendered (or static-generated) marketing pages for crawlability.
- `Organization`, `Service`, and `FAQPage` JSON-LD schema on `/`, `/for-brands`, `/for-creators`, `/faq`.
- Unique meta titles/descriptions per page targeting keywords identified in strategy doc §8 (e.g., "affordable influencer marketing platform India," "influencer marketing platform for startups").
- Sitemap + robots.txt allowing AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) — do not block, since AI-answer-engine visibility is a stated growth channel.

---

## 10. MVP Build Order (recommended sprint sequence)

1. Auth + role selection + creator onboarding wizard + creator dashboard (read-only profile)
2. Brand onboarding + Razorpay subscription checkout + creator discovery/search UI
3. Campaign creation + collaboration workspace (messaging only, no escrow yet)
4. Contract auto-generation integration
5. Escrow payment flow (Razorpay Route)
6. Public marketing pages + SEO/schema + `/trust-and-compliance`
7. Admin dashboard + dispute handling
8. Ratings/reviews + creator events module (Phase 4 per strategy doc)

---

*Companion document: `InfluenceOS-Business-Strategy.md` for market rationale, pricing logic, and go-to-market plan.*
