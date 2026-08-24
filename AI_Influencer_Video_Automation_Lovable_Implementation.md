# AI Influencer Video Automation & 24-Channel Social Publishing

## Lovable.dev Implementation Specification

**Version:** 1.0\
**Date:** 2026-08-24\
**Target:** Existing Lovable.dev social-media influencer platform\
**Primary backend assumption:** Supabase/PostgreSQL + Supabase Edge
Functions\
**Primary objective:** Turn a campaign brief into a finished AI
talking-presenter video, email/WhatsApp campaign assets, and a
scheduled/published package for up to 24 already-configured social
channels.

------------------------------------------------------------------------

## 1. Executive Summary

Build a provider-agnostic AI content and publishing engine inside the
existing platform.

The user should be able to enter:

-   Campaign/product/service
-   Target audience
-   Language
-   Presenter style
-   Duration
-   CTA
-   Website/landing page
-   Social channels
-   Publish date/time
-   WhatsApp recipients/audience
-   Email audience
-   Optional reference image/video
-   Optional brand kit

The platform then executes:

``` text
Campaign Brief
    ↓
AI Script Planner
    ↓
Presenter/Scene Planner
    ↓
AI Image/Video Provider Selection
    ↓
Video Generation Queue
    ↓
Voice / Native Audio
    ↓
Brand Overlay / FFmpeg
    ↓
Quality Control
    ↓
Platform-specific Caption Generator
    ↓
WhatsApp Campaign
    ↓
Email Campaign
    ↓
24-Channel Publishing Router
    ↓
Official API / Approved Publisher / Human Approval Queue
    ↓
Publishing + Status + Analytics
```

The architecture must be **provider agnostic**. Do not hard-code the
platform to one AI vendor.

------------------------------------------------------------------------

# 2. Important Security and Platform-Compliance Rule

Do **not** implement a system that asks users to hand over social-media
passwords to the application or that bypasses CAPTCHA, MFA, bot
detection, rate limits, platform restrictions, or security controls.

The platform should use this order:

1.  Official API/OAuth integration.
2.  Approved third-party social publishing provider.
3.  User-authorized browser/session workflow where the platform and
    channel terms permit it.
4.  Human approval queue for channels where automated publishing is
    unavailable.

If browser automation is used, it must be an explicit, user-authorized
workflow. Do not implement CAPTCHA solving, stealth fingerprints,
anti-bot evasion, credential harvesting, or automated MFA interception.

**Never store plaintext social passwords.**

For a channel with no supported API, the system should show:

> "Direct automated publishing is unavailable for this channel. Choose
> an approved publisher or move this post to the human approval queue."

This protects the application and its users from avoidable account
suspension and credential-security problems.

------------------------------------------------------------------------

# 3. Recommended AI Cost Strategy

Use a model router rather than one fixed model.

## 3.1 Text / Script

Primary:

``` text
Gemini 3.1 Flash-Lite
```

Use it for:

-   Script generation
-   Hook generation
-   Captions
-   Hashtags
-   Platform adaptations
-   Scene planning
-   QC instructions
-   Translation
-   Content metadata

Use a stronger Gemini model only when required.

The platform should support:

``` text
TEXT_MODEL_PRIMARY
TEXT_MODEL_FALLBACK
```

------------------------------------------------------------------------

## 3.2 Video

The preferred low-cost Google route should be:

``` text
veo-3.1-lite-generate-preview
```

with:

``` text
veo-3.1-fast-generate-preview
```

as the quality fallback.

Google currently documents Veo 3.1 Lite at approximately \$0.05/sec for
720p and \$0.08/sec for 1080p, while Veo 3.1 Fast is approximately
\$0.10/sec for 720p and \$0.12/sec for 1080p. Pricing and model
availability can change, so the application must never hard-code prices
as permanent values.

Veo 3.1 supports portrait 9:16 generation, native audio and image-based
direction.

For an 8-second generation, the rough model-cost target is therefore:

``` text
Veo 3.1 Lite 720p:  ~$0.40
Veo 3.1 Lite 1080p: ~$0.64
Veo 3.1 Fast 720p:  ~$0.80
Veo 3.1 Fast 1080p: ~$0.96
```

Actual production cost must be calculated from the current provider
response.

------------------------------------------------------------------------

## 3.3 Presenter / Talking Person

Support two modes:

### Mode A: Native generative presenter

Use a video model to generate:

-   Person
-   Environment
-   Movement
-   Dialogue
-   Audio

Recommended first provider:

``` text
Veo 3.1 Lite / Fast
```

### Mode B: Avatar/lip-sync pipeline

Use:

``` text
Reference image
      ↓
Avatar / lip-sync provider
      ↓
Voice
      ↓
Video
```

The system must support an `avatar` capability independently from the
main video generator.

This allows future integration with Kling Avatar or another provider
without changing the database or UI.

------------------------------------------------------------------------

# 4. Existing Models First

The application should discover which providers are already configured.

Create a provider registry:

``` typescript
type ProviderCapability =
  | "text"
  | "image"
  | "video"
  | "avatar"
  | "tts"
  | "music"
  | "storage"
  | "social"
  | "email"
  | "whatsapp";

interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  priority: number;
  costScore: number;
  qualityScore: number;
  latencyScore: number;
  supportsPortrait: boolean;
  supportsAudio: boolean;
  supportsReferenceImage: boolean;
  supportsAsyncJobs: boolean;
}
```

The UI should display:

``` text
Configured Providers
--------------------
✓ Gemini
✓ ElevenLabs
✓ Canva
✓ [Existing Video Provider]
✓ [Existing Social Integrations]
```

Do not assume a provider is available merely because it appears in the
UI. Verify its API credential and capability with a health check.

------------------------------------------------------------------------

# 5. Provider Router

Create:

``` text
src/services/ai/provider-router.ts
```

Example:

``` typescript
export interface VideoRequest {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  resolution: "720p" | "1080p" | "4k";
  referenceImages?: string[];
  generateAudio: boolean;
}

export interface VideoResult {
  provider: string;
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  audioUrl?: string;
  estimatedCost?: number;
}

export interface VideoProvider {
  id: string;
  canHandle(request: VideoRequest): Promise<boolean>;
  estimateCost(request: VideoRequest): Promise<number>;
  generate(request: VideoRequest): Promise<VideoResult>;
  getStatus(jobId: string): Promise<VideoResult>;
  cancel(jobId: string): Promise<void>;
}
```

Router:

``` typescript
export async function selectVideoProvider(
  request: VideoRequest,
  providers: VideoProvider[]
): Promise<VideoProvider> {

  const available = [];

  for (const provider of providers) {
    if (await provider.canHandle(request)) {
      available.push(provider);
    }
  }

  if (!available.length) {
    throw new Error("No compatible video provider is configured");
  }

  available.sort((a, b) => {
    return providerScore(a, request) - providerScore(b, request);
  });

  return available[0];
}
```

The scoring function should consider:

``` text
cost
quality
availability
failure rate
latency
resolution
audio support
portrait support
reference image support
```

------------------------------------------------------------------------

# 6. Database Schema

Use Supabase PostgreSQL.

## 6.1 `ai_providers`

``` sql
create table ai_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text unique not null,
  provider_name text not null,
  provider_type text not null,
  capabilities jsonb not null default '[]',
  enabled boolean default true,
  priority integer default 100,
  cost_score numeric default 50,
  quality_score numeric default 50,
  latency_score numeric default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

------------------------------------------------------------------------

## 6.2 `ai_provider_credentials`

Credentials must be encrypted or stored through the existing secrets
mechanism.

``` sql
create table ai_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references ai_providers(id) on delete cascade,
  account_label text,
  credential_ref text not null,
  enabled boolean default true,
  last_health_check timestamptz,
  health_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Do not store raw API keys in ordinary application tables.

Use:

``` text
Supabase secrets
or
external secrets manager
```

------------------------------------------------------------------------

# 7. Campaign Tables

## `campaigns`

``` sql
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  objective text,
  product_name text,
  product_description text,
  target_audience text,
  language text default 'English',
  tone text default 'professional',
  cta text,
  landing_url text,
  status text default 'draft',
  scheduled_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

------------------------------------------------------------------------

## `campaign_assets`

``` sql
create table campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  asset_type text not null,
  storage_path text,
  public_url text,
  metadata jsonb default '{}',
  provider text,
  provider_job_id text,
  status text default 'pending',
  created_at timestamptz default now()
);
```

Asset types:

``` text
presenter_image
reference_image
script
voice
raw_video
final_video
thumbnail
logo
caption
subtitle
email_html
whatsapp_template
```

------------------------------------------------------------------------

# 8. AI Generation Jobs

``` sql
create table ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  job_type text not null,
  provider text,
  model text,
  external_job_id text,
  status text default 'queued',
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  estimated_cost numeric,
  actual_cost numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
```

Job types:

``` text
script
presenter_image
video
voice
subtitle
thumbnail
caption
translation
render
qc
```

------------------------------------------------------------------------

# 9. Social Account Registry

The existing 24 channels should be represented uniformly.

``` sql
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  platform_key text not null,
  account_name text,
  account_handle text,
  account_type text,
  connection_type text,
  credential_ref text,
  status text default 'connected',
  capabilities jsonb default '{}',
  last_health_check timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Example:

``` json
{
  "platform_key": "linkedin",
  "connection_type": "oauth",
  "capabilities": {
    "text": true,
    "image": true,
    "video": true,
    "scheduled": true
  }
}
```

------------------------------------------------------------------------

# 10. Social Publishing Architecture

Every platform gets an adapter.

``` text
SocialPublisher
   |
   +-- LinkedInPublisher
   +-- InstagramPublisher
   +-- FacebookPublisher
   +-- YouTubePublisher
   +-- TikTokPublisher
   +-- XPublisher
   +-- PinterestPublisher
   +-- ThreadsPublisher
   +-- ...
```

Interface:

``` typescript
export interface SocialPublisher {
  platform: string;

  validateConnection(accountId: string): Promise<boolean>;

  uploadMedia(
    accountId: string,
    assetUrl: string
  ): Promise<{
    mediaId: string;
  }>;

  publish(
    accountId: string,
    post: SocialPost
  ): Promise<PublishResult>;

  getStatus(
    externalPostId: string
  ): Promise<PublishResult>;

  delete?(
    externalPostId: string
  ): Promise<void>;
}
```

------------------------------------------------------------------------

# 11. Publishing Priority

The router must always use:

``` text
Priority 1: Official API
Priority 2: Approved third-party publisher
Priority 3: User-authorized permitted workflow
Priority 4: Human approval queue
```

Never:

``` text
Username + password → hidden automated login → bypass restrictions
```

------------------------------------------------------------------------

# 12. Official API Examples

## LinkedIn

LinkedIn's current Posts API supports organic text, images, videos and
other post types. It requires the appropriate permissions and versioned
API headers.

Implement the official adapter first.

Pseudo-flow:

``` text
OAuth
 ↓
Get organization/member identity
 ↓
Upload video
 ↓
Receive media URN
 ↓
Create Post
 ↓
Store returned post ID
 ↓
Poll status
```

------------------------------------------------------------------------

## YouTube

Use the YouTube Data API.

Flow:

``` text
OAuth
 ↓
videos.insert
 ↓
Upload MP4
 ↓
Set title/description/tags
 ↓
Set privacy status
 ↓
Store video ID
```

Do not automate the YouTube website when the API is available.

------------------------------------------------------------------------

## Instagram / Facebook

Where the existing Meta account and permissions support publishing, use
the official Meta APIs.

The adapter must first check:

``` text
account type
permissions
media type
publishing eligibility
token validity
```

If unavailable:

``` text
fallback → approved publisher → approval queue
```

------------------------------------------------------------------------

## TikTok

Implement TikTok's Content Posting API when the connected
application/account has the required permissions and publishing
capabilities.

If direct publishing is unavailable:

``` text
TikTok status = NEEDS_APPROVAL
```

Do not silently attempt a website-login workaround.

------------------------------------------------------------------------

# 13. Third-Party Publisher Adapter

Create a generic adapter:

``` typescript
export interface ThirdPartyPublisher {
  provider: string;

  validate(): Promise<boolean>;

  publishVideo(input: {
    accountId: string;
    videoUrl: string;
    caption: string;
    scheduledAt?: string;
  }): Promise<PublishResult>;
}
```

This lets the application support a service such as:

``` text
Buffer
Metricool
Publer
Ayrshare
or another approved publisher
```

without changing the campaign architecture.

The admin can select:

``` text
Social Settings
  ↓
Publishing Provider
  ↓
Native APIs
  OR
Third-party publisher
```

------------------------------------------------------------------------

# 14. Unsupported Channel Workflow

For channels without API access:

``` text
Campaign
   ↓
Content ready
   ↓
Channel = unsupported
   ↓
Create Publishing Task
   ↓
User opens platform
   ↓
User logs in
   ↓
User confirms/publishes
   ↓
User marks task complete
```

The dashboard should show:

``` text
24 Channels

✓ LinkedIn       Published
✓ Facebook       Published
✓ Instagram      Published
✓ YouTube        Published
✓ Pinterest      Published

⚠ Channel X      Approval Required
⚠ Channel Y      API Unavailable
```

This is safer than storing passwords.

------------------------------------------------------------------------

# 15. Browser Automation Option

If a particular platform legally/contractually permits user-authorized
browser automation, isolate it into a separate worker.

Suggested architecture:

``` text
Lovable App
     ↓
Publishing Queue
     ↓
Browser Worker
     ↓
Playwright
     ↓
User-authorized browser/session
```

Rules:

-   Never store plaintext passwords.
-   Never bypass CAPTCHA.
-   Never bypass MFA.
-   Never defeat anti-bot systems.
-   Never spoof fingerprints.
-   Never scrape private information.
-   Stop when human verification is required.
-   Log the exact publishing result.
-   Provide a kill switch.
-   Rate-limit aggressively.

If the channel does not permit automation, do not use this route.

------------------------------------------------------------------------

# 16. WhatsApp Campaign

Use the official WhatsApp Business/Cloud API where available.

Create:

``` sql
create table whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  phone_list jsonb,
  template_name text,
  language text,
  media_url text,
  status text default 'draft',
  created_at timestamptz default now()
);
```

Flow:

``` text
Final video
 ↓
Upload media
 ↓
Approved WhatsApp template
 ↓
Send campaign
 ↓
Delivery webhook
 ↓
Read/failed status
```

Do not implement WhatsApp Web password automation.

------------------------------------------------------------------------

# 17. Email Campaign

Support the existing email provider.

Recommended interface:

``` typescript
interface EmailProvider {
  sendCampaign(input: {
    recipients: string[];
    subject: string;
    html: string;
    text: string;
    attachments?: string[];
  }): Promise<{
    campaignId: string;
  }>;
}
```

Preferred integration:

``` text
Gmail API
OR
existing transactional provider
```

Use provider webhooks for delivery/bounce/open/click data where
supported.

------------------------------------------------------------------------

# 18. Video Production Pipeline

## Stage 1: Brief

Input:

``` json
{
  "product": "Luxury Resort Investment",
  "audience": "HNI investors",
  "language": "English",
  "duration": 30,
  "style": "premium UGC",
  "presenter": "female_indian_01",
  "cta": "Contact Innovexsis Consulting",
  "aspect_ratio": "9:16"
}
```

------------------------------------------------------------------------

## Stage 2: Script generation

Prompt Gemini:

``` text
You are the senior advertising scriptwriter.

Create a 25-30 second vertical video script.

Requirements:
- Indian audience
- Natural spoken English
- No exaggerated claims
- No unsupported financial guarantees
- Strong first 2 seconds
- Conversational female presenter
- One clear CTA
- Avoid corporate jargon
- Write speech only
- Return scene-by-scene JSON

Return:
{
  "hook": "",
  "scenes": [],
  "spoken_script": "",
  "onscreen_text": [],
  "cta": ""
}
```

------------------------------------------------------------------------

# 19. Scene JSON

Example:

``` json
{
  "duration": 8,
  "scene": 1,
  "visual": "Indian female presenter standing in a premium modern office, looking directly into camera",
  "dialogue": "What if your next investment opportunity was already closer than you think?",
  "camera": "medium close-up, subtle handheld movement",
  "expression": "confident and conversational"
}
```

------------------------------------------------------------------------

# 20. Generate Presenter Reference Image

If no presenter image exists:

``` text
Generate one high-quality portrait reference image.

Requirements:
- photorealistic
- Indian woman
- 25-32
- professional
- approachable
- natural skin texture
- realistic hair
- subtle makeup
- neutral premium background
- direct eye contact
- medium close-up
- 9:16 composition
```

Save:

``` text
presenter_image
```

in Supabase Storage.

------------------------------------------------------------------------

# 21. Generate Video

For Veo:

``` typescript
const videoRequest = {
  model: "veo-3.1-lite-generate-preview",
  prompt: scenePrompt,
  aspectRatio: "9:16",
  resolution: "720p",
  generateAudio: true,
  referenceImages: [presenterImageUrl]
};
```

Do not hard-code this model forever.

Store it in:

``` text
ai_model_registry
```

------------------------------------------------------------------------

# 22. Model Registry

``` sql
create table ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references ai_providers(id),
  model_key text not null,
  capability text not null,
  enabled boolean default true,
  quality_score numeric,
  cost_per_second numeric,
  supports_audio boolean default false,
  supports_portrait boolean default false,
  supports_reference_image boolean default false,
  deprecated_at timestamptz,
  metadata jsonb default '{}',
  unique(provider_id, model_key)
);
```

This lets an administrator change:

``` text
Current video model:
Veo 3.1 Lite
```

without redeploying the application.

------------------------------------------------------------------------

# 23. Automatic Cost Optimisation

Implement a cost controller.

``` typescript
interface CostPolicy {
  maxCostPerVideo: number;
  maxRetries: number;
  preferredQuality: "economy" | "balanced" | "premium";
}
```

Example:

``` text
Economy:
720p
Veo Lite
1 retry

Balanced:
1080p
Veo Fast
2 retries

Premium:
1080p/4K
best available model
3 retries
```

Default:

``` text
Economy
```

for social media.

------------------------------------------------------------------------

# 24. Generation Retry Policy

Never blindly retry.

``` text
Attempt 1
 ↓
Failure
 ↓
same provider retry once
 ↓
Failure
 ↓
fallback provider
 ↓
Failure
 ↓
manual review
```

Record every attempt.

------------------------------------------------------------------------

# 25. Video Assembly

Raw AI video should not be the final asset.

Use FFmpeg in a server-side worker.

Pipeline:

``` text
Raw AI video
+
Logo
+
CTA
+
WhatsApp number
+
Website
+
Subtitles
+
Music
↓
FFmpeg
↓
Final MP4
```

Example command:

``` bash
ffmpeg \
  -i input.mp4 \
  -i logo.png \
  -filter_complex \
  "[0:v][1:v]overlay=W-w-32:32,format=yuv420p" \
  -c:v libx264 \
  -preset medium \
  -crf 20 \
  -movflags +faststart \
  output.mp4
```

For subtitles:

``` bash
ffmpeg \
  -i input.mp4 \
  -vf "subtitles=caption.srt" \
  -c:a copy \
  output.mp4
```

------------------------------------------------------------------------

# 26. Brand Overlay System

Create a reusable brand template.

``` sql
create table brand_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  name text,
  logo_url text,
  primary_font text,
  secondary_font text,
  colors jsonb,
  overlay_config jsonb,
  created_at timestamptz default now()
);
```

Overlay configuration:

``` json
{
  "logo": {
    "position": "top-right",
    "width": 180
  },
  "cta": {
    "position": "bottom",
    "style": "pill"
  },
  "website": {
    "position": "bottom"
  },
  "phone": {
    "position": "bottom"
  }
}
```

------------------------------------------------------------------------

# 27. Automatic Subtitles

Generate transcript from:

``` text
Native video audio
OR
generated script
```

Generate:

``` text
SRT
VTT
ASS
```

Burn subtitles into the social version.

Also keep a clean master without burned subtitles.

------------------------------------------------------------------------

# 28. Platform Variants

Do not post exactly the same copy to every channel.

Create:

``` text
master_caption
linkedin_caption
instagram_caption
facebook_caption
youtube_title
youtube_description
youtube_tags
tiktok_caption
x_caption
pinterest_description
threads_caption
```

Gemini should generate platform-specific variants.

------------------------------------------------------------------------

# 29. Caption JSON

``` json
{
  "linkedin": {
    "caption": "",
    "hashtags": []
  },
  "instagram": {
    "caption": "",
    "hashtags": []
  },
  "facebook": {
    "caption": "",
    "hashtags": []
  },
  "youtube": {
    "title": "",
    "description": "",
    "tags": []
  },
  "tiktok": {
    "caption": "",
    "hashtags": []
  }
}
```

------------------------------------------------------------------------

# 30. Social Publishing Jobs

``` sql
create table social_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  asset_id uuid references campaign_assets(id),
  social_account_id uuid references social_accounts(id),
  publisher_type text,
  status text default 'queued',
  scheduled_at timestamptz,
  external_post_id text,
  external_url text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  retry_count integer default 0,
  published_at timestamptz,
  created_at timestamptz default now()
);
```

------------------------------------------------------------------------

# 31. Publishing State Machine

``` text
DRAFT
 ↓
READY
 ↓
QUEUED
 ↓
UPLOADING
 ↓
PROCESSING
 ↓
PUBLISHED
```

Failure:

``` text
FAILED
 ↓
RETRYING
 ↓
QUEUED
```

Permanent failure:

``` text
BLOCKED
```

Unsupported:

``` text
NEEDS_APPROVAL
```

------------------------------------------------------------------------

# 32. Queue Architecture

Use a durable queue.

Recommended:

``` text
Supabase PostgreSQL
+
pg_cron
+
queue table
```

or an external worker/queue if the existing platform already has one.

Jobs:

``` text
script_generation
image_generation
video_generation
voice_generation
render
qc
caption_generation
whatsapp
email
social_publish
analytics_sync
```

Every job must be idempotent.

------------------------------------------------------------------------

# 33. Idempotency

Every publishing request must have:

``` text
idempotency_key
```

Example:

``` typescript
const idempotencyKey =
  `${campaignId}:${socialAccountId}:${assetId}`;
```

Before publishing:

``` sql
select *
from social_publish_jobs
where idempotency_key = $1;
```

If already published:

``` text
Do not publish again.
```

------------------------------------------------------------------------

# 34. Webhook System

Create:

``` text
/api/webhooks/ai/*
/api/webhooks/social/*
/api/webhooks/whatsapp/*
/api/webhooks/email/*
```

Each webhook must:

1.  Validate signature.
2.  Find job.
3.  Update status.
4.  Store provider response.
5.  Trigger next job.
6.  Never expose secrets.

------------------------------------------------------------------------

# 35. Campaign Orchestrator

Main workflow:

``` typescript
async function runCampaign(campaignId: string) {

  const campaign = await getCampaign(campaignId);

  await queue("script_generation", {
    campaignId
  });

  await queue("presenter_generation", {
    campaignId
  });

  await queue("video_generation", {
    campaignId
  });

  await queue("render", {
    campaignId
  });

  await queue("quality_control", {
    campaignId
  });

  await queue("caption_generation", {
    campaignId
  });

  await queue("whatsapp_generation", {
    campaignId
  });

  await queue("email_generation", {
    campaignId
  });

  await queue("social_distribution", {
    campaignId
  });
}
```

In production, the orchestrator should enqueue dependent jobs only after
prerequisites complete rather than firing every job simultaneously.

------------------------------------------------------------------------

# 36. Dependency Graph

``` text
CAMPAIGN
   |
   +--> SCRIPT
   |
   +--> PRESENTER IMAGE
   |
   +--> VIDEO
           |
           +--> AUDIO
           |
           +--> SUBTITLE
           |
           +--> BRAND RENDER
                    |
                    +--> QC
                           |
                           +--> CAPTIONS
                           |
                           +--> WHATSAPP
                           |
                           +--> EMAIL
                           |
                           +--> SOCIAL
```

------------------------------------------------------------------------

# 37. Quality Control Agent

Before publishing, run an AI QC step.

Input:

``` text
Final video
Script
Brand data
Campaign rules
```

Ask Gemini to check:

``` text
1. Is the speech intelligible?
2. Does the video match the script?
3. Is the presenter visually acceptable?
4. Is the CTA correct?
5. Are contact details correct?
6. Are there hallucinated claims?
7. Are subtitles synchronized?
8. Is the video vertical?
9. Is the logo visible?
10. Is there offensive or unsafe content?
```

Return:

``` json
{
  "approved": true,
  "score": 94,
  "issues": [],
  "requires_human_review": false
}
```

------------------------------------------------------------------------

# 38. Mandatory Human Review Conditions

Automatically stop publishing if:

``` text
financial guarantee
medical claim
legal guarantee
government affiliation claim
celebrity likeness
unverified testimonial
unverified property claim
incorrect phone number
incorrect URL
copyright concern
AI presenter identity concern
provider safety flag
```

The user must be able to override only after an explicit review.

------------------------------------------------------------------------

# 39. Dashboard

Create a new section:

``` text
AI VIDEO STUDIO
```

Tabs:

``` text
Create
Presenters
Scripts
Videos
Campaigns
Publishing
WhatsApp
Email
Analytics
Providers
Costs
```

------------------------------------------------------------------------

# 40. Create Video UI

Form:

``` text
Campaign Name
Product / Service
Target Audience
Language
Video Duration
Presenter
Style
CTA
Landing URL
Brand
Social Channels
WhatsApp
Email
Publish Date
```

Buttons:

``` text
Generate Script
Generate Video
Preview
Approve
Schedule
Publish
```

------------------------------------------------------------------------

# 41. Presenter Library

Cards:

``` text
Female 01
Indian
Corporate
Available

Female 02
Indian
Real Estate
Available

Female 03
Indian
Startup
Available
```

Each presenter should have:

``` text
reference image
voice ID
supported languages
style
age range
clothing style
brand associations
consent/source metadata
```

Do not create a real person's likeness without permission.

------------------------------------------------------------------------

# 42. Voice Library

``` sql
create table voice_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  provider text,
  provider_voice_id text,
  name text,
  language text,
  gender text,
  style text,
  enabled boolean default true,
  consent_metadata jsonb default '{}'
);
```

------------------------------------------------------------------------

# 43. Existing ElevenLabs Integration

If ElevenLabs is already connected, register it as:

``` text
capability:
tts
```

The voice router should select:

``` text
Existing ElevenLabs voice
```

before provisioning a new voice provider.

If it is not available:

``` text
native video audio
```

can be used.

------------------------------------------------------------------------

# 44. Existing Gemini Integration

If Gemini is already configured, use it for:

``` text
script
caption
translation
scene planning
QC
metadata
thumbnail prompt
```

Use the lowest-cost model capable of the task.

For high-volume generation, use the cost-efficient Flash-Lite class
model.

------------------------------------------------------------------------

# 45. Existing Canva Integration

If the current platform already has Canva connectivity, use it for
templates where possible.

Otherwise, render using FFmpeg.

Do not make Canva a mandatory dependency for every campaign.

------------------------------------------------------------------------

# 46. File Storage

Use Supabase Storage buckets:

``` text
campaign-inputs
presenters
voices
raw-video
rendered-video
thumbnails
subtitles
exports
```

Use signed URLs for private assets.

Do not make raw assets public unless required.

------------------------------------------------------------------------

# 47. API Endpoints

Create these Edge Functions:

``` text
POST /functions/v1/campaign-create
POST /functions/v1/script-generate
POST /functions/v1/presenter-generate
POST /functions/v1/video-generate
POST /functions/v1/video-status
POST /functions/v1/video-render
POST /functions/v1/video-qc
POST /functions/v1/caption-generate
POST /functions/v1/whatsapp-send
POST /functions/v1/email-send
POST /functions/v1/social-publish
POST /functions/v1/social-health-check
POST /functions/v1/provider-health-check
GET  /functions/v1/campaign-status
```

------------------------------------------------------------------------

# 48. Example Edge Function

``` typescript
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json();

    if (!body.campaignId) {
      return Response.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    // Load campaign
    // Validate workspace permissions
    // Create generation job
    // Enqueue worker

    return Response.json({
      success: true,
      campaignId: body.campaignId,
      status: "queued"
    });

  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
});
```

------------------------------------------------------------------------

# 49. Secrets

Required examples:

``` text
GEMINI_API_KEY
ELEVENLABS_API_KEY
KLING_API_KEY
META_APP_ID
META_APP_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
EMAIL_PROVIDER_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
```

Only define variables for providers actually used.

Do not expose any of these to frontend JavaScript.

Never use:

``` text
VITE_GEMINI_API_KEY
VITE_META_SECRET
VITE_LINKEDIN_SECRET
```

Secrets must remain server-side.

------------------------------------------------------------------------

# 50. RLS

Enable RLS:

``` sql
alter table campaigns enable row level security;
alter table campaign_assets enable row level security;
alter table social_accounts enable row level security;
alter table social_publish_jobs enable row level security;
```

Users can only access records belonging to their workspace.

Provider credentials must never be directly selectable by normal client
queries.

------------------------------------------------------------------------

# 51. Audit Log

``` sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

Record:

``` text
script generated
video generated
video approved
video rejected
provider changed
social account connected
post published
post failed
WhatsApp sent
email sent
```

------------------------------------------------------------------------

# 52. Cost Ledger

``` sql
create table ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  campaign_id uuid,
  provider text,
  model text,
  operation text,
  units numeric,
  unit_type text,
  estimated_cost numeric,
  actual_cost numeric,
  currency text default 'USD',
  created_at timestamptz default now()
);
```

Dashboard:

``` text
This Month

AI Text       $2.40
Images        $4.20
Video         $37.80
Voice         $5.10
Publishing    $0.00

Total         $49.50
```

------------------------------------------------------------------------

# 53. Cost Guardrails

Workspace settings:

``` text
Maximum cost/video: $5
Maximum daily AI spend: $25
Maximum monthly AI spend: $250
Maximum retries: 2
Default quality: Economy
```

If the next generation would exceed the budget:

``` text
PAUSE
```

and request approval.

------------------------------------------------------------------------

# 54. Social Channel Configuration

The existing 24 channels should not require code changes.

Admin screen:

``` text
Channel
Connection
Publisher
Capabilities
Status
Last Check
```

Example:

``` text
Instagram   Native API       ✓
Facebook    Native API       ✓
LinkedIn    Native API       ✓
YouTube     Native API       ✓
TikTok      Native API       ✓
X           Native API       ✓
Channel 7   Third-party      ✓
Channel 8   Manual           ⚠
```

------------------------------------------------------------------------

# 55. Platform Capability Matrix

Store dynamically:

``` json
{
  "video": true,
  "image": true,
  "text": true,
  "stories": false,
  "reels": true,
  "shorts": true,
  "scheduled": true,
  "direct_publish": true
}
```

The campaign engine should automatically select the correct content
type.

------------------------------------------------------------------------

# 56. Automatic 24-Channel Distribution

When user selects:

``` text
Publish to all connected channels
```

the router does:

``` typescript
for (const account of connectedAccounts) {

  const capability =
    await getCapabilities(account.platform_key);

  const publisher =
    await selectPublisher(account, capability);

  await createPublishJob({
    campaignId,
    accountId: account.id,
    publisher
  });
}
```

No platform-specific code should exist inside the campaign UI.

------------------------------------------------------------------------

# 57. Social Publishing Result

Every channel returns:

``` json
{
  "platform": "linkedin",
  "status": "published",
  "externalPostId": "urn:li:share:123",
  "url": "...",
  "publishedAt": "..."
}
```

Dashboard:

``` text
24/24 Complete

Published: 20
Scheduled: 2
Approval Required: 1
Failed: 1
```

------------------------------------------------------------------------

# 58. Human Approval Queue

Create:

``` sql
create table approval_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  channel text,
  asset_url text,
  caption text,
  reason text,
  status text default 'pending',
  assigned_to uuid,
  approved_at timestamptz,
  created_at timestamptz default now()
);
```

UI:

``` text
Needs Approval

TikTok
Reason: Direct publishing unavailable

[Open Channel]
[Mark Published]
[Retry]
```

------------------------------------------------------------------------

# 59. WhatsApp + Email + Social One-Click Campaign

The final campaign screen should show:

``` text
CAMPAIGN READY

Video          ✓
Caption        ✓
Thumbnail      ✓
WhatsApp       ✓
Email          ✓
Social         22/24 ✓

[Approve & Schedule All]
```

After approval:

``` text
WhatsApp → scheduled
Email → scheduled
Social → scheduled
```

------------------------------------------------------------------------

# 60. Scheduling

Store all times in UTC.

Display in workspace timezone.

``` sql
scheduled_at timestamptz
```

Use:

``` text
Asia/Kolkata
```

as the default workspace timezone if the existing platform is
India-focused, but make it configurable.

------------------------------------------------------------------------

# 61. Analytics

Collect:

``` text
published
views
likes
comments
shares
clicks
followers gained
watch time
completion rate
```

Do not assume every platform exposes every metric.

Normalize:

``` typescript
interface SocialMetrics {
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  watchTimeSeconds?: number;
}
```

------------------------------------------------------------------------

# 62. AI Campaign Optimization

After enough data exists, Gemini can analyze:

``` text
Best hook
Best presenter
Best duration
Best CTA
Best channel
Best posting time
Best language
```

Example output:

``` text
Best performing format:
Female presenter + 22 sec + Hindi-English

Best hook:
"Property buyers are making one mistake..."

Best channel:
Instagram Reels

Recommended next test:
20-24 sec
stronger first 2 seconds
CTA in final 4 seconds
```

------------------------------------------------------------------------

# 63. A/B Testing

Support:

``` text
Variant A
Variant B
Variant C
```

Only change one major variable:

``` text
hook
presenter
CTA
voice
thumbnail
caption
```

Do not regenerate every variable simultaneously.

------------------------------------------------------------------------

# 64. API Failure Handling

Example:

``` typescript
async function publishWithFallback(job) {

  const native = await tryNativeAPI(job);

  if (native.success) {
    return native;
  }

  const thirdParty = await tryThirdPartyPublisher(job);

  if (thirdParty.success) {
    return thirdParty;
  }

  return {
    status: "NEEDS_APPROVAL",
    reason: "No automated publisher available"
  };
}
```

Never silently attempt unsupported login automation.

------------------------------------------------------------------------

# 65. Provider Health Checks

Every provider gets:

``` text
GET /provider-health-check
```

Result:

``` json
{
  "provider": "gemini",
  "status": "healthy",
  "latencyMs": 421,
  "checkedAt": "..."
}
```

Dashboard:

``` text
Gemini       ✓ Healthy
ElevenLabs   ✓ Healthy
Veo          ✓ Healthy
LinkedIn     ✓ Healthy
Instagram    ⚠ Token expires soon
TikTok       ✕ Permission error
```

------------------------------------------------------------------------

# 66. Token Expiry

OAuth tokens should be refreshed automatically where supported.

If refresh fails:

``` text
connection_status = reauthorization_required
```

Show:

``` text
Reconnect Instagram
```

Never ask the user to paste an access token into a normal chat box.

------------------------------------------------------------------------

# 67. Content Safety

Before publication:

``` text
AI safety check
+
brand claim check
+
contact information check
+
URL check
```

If the campaign contains:

``` text
investment returns
financial guarantees
legal guarantees
medical claims
political persuasion
regulated products
```

force human review.

------------------------------------------------------------------------

# 68. AI Presenter Consent

For uploaded real-person images:

``` text
presenter_source_type:
  generated
  licensed_stock
  user_uploaded
  employee
  client
```

If `user_uploaded` or `employee`:

``` text
consent_confirmed = true
```

must be required before generation.

Do not build a system intended to impersonate real people without
authorization.

------------------------------------------------------------------------

# 69. Recommended Folder Structure

``` text
src/
  components/
    ai-video/
    campaign/
    presenters/
    publishing/
    social/
    whatsapp/
    email/

  services/
    ai/
      provider-router.ts
      text/
      image/
      video/
      avatar/
      voice/
    social/
      social-router.ts
      publishers/
    messaging/
      whatsapp.ts
      email.ts
    rendering/
      ffmpeg.ts
    qc/
      content-qc.ts
    costs/
      cost-controller.ts

supabase/
  functions/
    campaign-create/
    script-generate/
    presenter-generate/
    video-generate/
    video-status/
    render-video/
    video-qc/
    caption-generate/
    social-publish/
    whatsapp-send/
    email-send/
    provider-health/
    webhooks/

  migrations/
    001_ai_providers.sql
    002_ai_models.sql
    003_campaigns.sql
    004_assets.sql
    005_generation_jobs.sql
    006_social_accounts.sql
    007_publish_jobs.sql
    008_approval_tasks.sql
    009_cost_ledger.sql
    010_audit_logs.sql
```

------------------------------------------------------------------------

# 70. Lovable Implementation Prompt

Paste the following into Lovable.dev after uploading this specification:

``` text
Implement the attached AI Influencer Video Automation specification.

IMPORTANT:
Do not redesign or replace the existing application.
Inspect the current application and preserve:
- existing authentication
- existing workspace model
- existing 24 social channel integrations
- existing campaign model
- existing branding
- existing Supabase database
- existing navigation

First perform a codebase audit.

Create an implementation plan based on the existing architecture.

Then implement the following modules incrementally:

1. AI provider registry
2. AI model registry
3. campaign video studio
4. presenter library
5. video generation queue
6. FFmpeg rendering service
7. AI quality-control service
8. caption generation
9. WhatsApp campaign adapter
10. email campaign adapter
11. unified social publishing router
12. native API adapters
13. approved third-party publisher adapter
14. human approval queue
15. cost ledger
16. provider health monitoring
17. publishing analytics

Do not expose API keys in the browser.

Use Supabase Edge Functions for all provider secrets.

Use database migrations for every new table.

Use Row Level Security.

Use idempotency keys for every asynchronous job.

Do not implement credential harvesting or password storage.

Do not implement CAPTCHA bypass, MFA interception, bot-detection bypass, fingerprint spoofing, rate-limit bypass, or stealth automation.

For unsupported social platforms:
- create a NEEDS_APPROVAL publishing job
- show the user the exact reason
- provide an approved publisher option if configured
- otherwise provide a manual publishing task

Use the configured AI providers first.
Only use fallback providers when the primary provider is unavailable or fails.

Implement the model router so video models can be changed from the admin panel without changing application code.

Default video profile:
- 9:16
- 720p
- economy
- native audio when supported
- 8-second scene generation
- multiple scenes assembled with FFmpeg

Generate platform-specific captions rather than duplicating one caption everywhere.

Add a campaign status page showing:
- script
- presenter
- generation
- rendering
- QC
- WhatsApp
- email
- each social channel
- cost
- errors
- retry controls

Before writing code, inspect the existing schema and integrations and reuse them wherever possible.
```

------------------------------------------------------------------------

# 71. First Implementation Sprint

Do not build all 24 publishers first.

Build this vertical slice:

``` text
Campaign
 ↓
Gemini Script
 ↓
Veo 3.1 Lite
 ↓
FFmpeg
 ↓
QC
 ↓
LinkedIn
 ↓
WhatsApp
 ↓
Email
```

Once this works:

``` text
Add Instagram
Add Facebook
Add YouTube
Add TikTok
Add X
...
```

This reduces debugging complexity dramatically.

------------------------------------------------------------------------

# 72. MVP Acceptance Test

A campaign is considered successful when:

``` text
[ ] User creates campaign
[ ] Gemini creates script
[ ] User approves script
[ ] Presenter is selected
[ ] Video is generated
[ ] Video is rendered
[ ] Logo/CTA is correct
[ ] Phone number is correct
[ ] URL is correct
[ ] Subtitles are correct
[ ] QC passes
[ ] Caption variants are generated
[ ] WhatsApp campaign is queued
[ ] Email campaign is queued
[ ] LinkedIn publishes
[ ] Result is stored
[ ] Failed channels appear in approval queue
[ ] Total cost is recorded
```

------------------------------------------------------------------------

# 73. Production Acceptance Test

``` text
[ ] 24 channels can be represented
[ ] Native APIs are preferred
[ ] Third-party publisher fallback works
[ ] Unsupported channels become approval tasks
[ ] OAuth refresh works
[ ] Failed tokens are detected
[ ] Duplicate publishing is prevented
[ ] Jobs survive page refresh
[ ] Jobs survive server restart
[ ] Webhooks are idempotent
[ ] Provider failures trigger fallback
[ ] Cost limits work
[ ] RLS works
[ ] Secrets never reach frontend
[ ] Audit logs work
[ ] Kill switch works
```

------------------------------------------------------------------------

# 74. Admin Kill Switch

Create:

``` text
Settings
→ AI Automation
→ Emergency Controls
```

Options:

``` text
[ ] Pause all video generation
[ ] Pause all social publishing
[ ] Pause WhatsApp
[ ] Pause email
[ ] Disable provider
[ ] Disable third-party publishing
```

This is mandatory for a multi-channel automation system.

------------------------------------------------------------------------

# 75. Final Target Architecture

``` text
                         ┌───────────────────┐
                         │   LOVABLE FRONTEND│
                         │ Campaign / Studio │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ SUPABASE / API    │
                         │ Auth + RLS + DB   │
                         └─────────┬─────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
          ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
          │ AI ROUTER   │   │ MEDIA       │   │ PUBLISHING  │
          │             │   │ PIPELINE    │   │ ROUTER      │
          └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                 │                 │                 │
        ┌────────┼────────┐        │       ┌─────────┼─────────┐
        ▼        ▼        ▼        ▼       ▼         ▼         ▼
      Gemini   Video    Voice    FFmpeg  Native   Third-party  Manual
                                    │     APIs      APIs       Queue
                                    │
                                    ▼
                              Final MP4
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
              WhatsApp            Email          24 Social Channels
```

------------------------------------------------------------------------

# 76. Recommended Default Configuration

``` json
{
  "text": {
    "primary": "gemini-3.1-flash-lite",
    "fallback": "gemini-3.1-pro-preview"
  },
  "video": {
    "primary": "veo-3.1-lite-generate-preview",
    "fallback": "veo-3.1-fast-generate-preview",
    "resolution": "720p",
    "aspectRatio": "9:16",
    "nativeAudio": true
  },
  "voice": {
    "primary": "existing-configured-provider"
  },
  "render": {
    "engine": "ffmpeg",
    "codec": "h264",
    "crf": 20
  },
  "publishing": {
    "nativeApiFirst": true,
    "thirdPartySecond": true,
    "manualFallback": true,
    "passwordAutomation": false
  },
  "cost": {
    "profile": "economy",
    "maxCostPerVideoUsd": 5,
    "maxRetries": 2
  }
}
```

------------------------------------------------------------------------

# 77. Key Design Decision

The platform should **not** be designed around "which AI model is best?"

It should be designed around:

``` text
Which configured provider can complete this job
at the lowest acceptable cost
with the required quality
and the lowest failure probability?
```

That makes the platform future-proof.

If a cheaper model becomes available tomorrow, an administrator should
be able to add:

``` text
Provider
Model
Price
Capabilities
Quality
```

and make it the default without rebuilding the application.

------------------------------------------------------------------------

# 78. Current Provider Strategy

As of the current specification date, Google documents:

``` text
Veo 3.1 Lite
Veo 3.1 Fast
Veo 3.1 Standard
```

with Lite positioned as the lower-cost/high-volume option.

The implementation must query/configure current provider pricing rather
than assuming these prices are permanent.

The same rule applies to:

``` text
Kling
ElevenLabs
OpenAI
Runway
Luma
other future providers
```

------------------------------------------------------------------------

# 79. Final User Experience

The finished product should ultimately be this simple:

``` text
CREATE AI AD

What are you promoting?
[________________________]

Who is it for?
[________________________]

Language:
[English ▼]

Presenter:
[Indian Female 01 ▼]

Duration:
[30 sec ▼]

Style:
[Premium UGC ▼]

CTA:
[Contact us today]

Publish to:
☑ WhatsApp
☑ Email
☑ LinkedIn
☑ Instagram
☑ Facebook
☑ YouTube
☑ TikTok
☑ X
☑ All connected channels

[ GENERATE AD ]
```

Then:

``` text
Generating script       ✓
Generating presenter    ✓
Generating video        ✓
Rendering               ✓
Quality check           ✓
Creating captions       ✓
WhatsApp                ✓
Email                   ✓
Social publishing       22/24 ✓

[ APPROVE & PUBLISH ]
```

This is the intended end-state.

------------------------------------------------------------------------

# 80. Implementation Order

### Phase 1

``` text
Provider registry
Model registry
Campaign video studio
Gemini
Veo
FFmpeg
QC
```

### Phase 2

``` text
Presenter library
Voice library
Brand templates
Caption engine
```

### Phase 3

``` text
WhatsApp
Email
LinkedIn
Instagram
Facebook
YouTube
```

### Phase 4

``` text
Remaining social channels
Third-party publisher adapter
Human approval queue
```

### Phase 5

``` text
Analytics
A/B testing
Cost optimisation
Automatic model selection
```

------------------------------------------------------------------------

# 81. Developer Instruction

Do not attempt to implement the entire specification in one uncontrolled
Lovable generation.

Use this sequence:

``` text
1. Audit existing project
2. Audit existing Supabase schema
3. Audit existing 24 social integrations
4. Audit existing AI provider credentials/configuration
5. Produce migration plan
6. Implement database
7. Implement provider router
8. Implement one complete video pipeline
9. Test end-to-end
10. Implement WhatsApp/email
11. Implement native publishing adapters
12. Implement fallback publisher
13. Implement approval queue
14. Add remaining channels
15. Add analytics
16. Production hardening
```

At every phase, preserve existing functionality.

------------------------------------------------------------------------

# 82. Definition of Done

The feature is complete when a user can go from:

``` text
ONE CAMPAIGN BRIEF
```

to:

``` text
ONE APPROVED AI VIDEO
```

and then to:

``` text
WHATSAPP
+
EMAIL
+
ALL SUPPORTED SOCIAL CHANNELS
```

without manually downloading files, rewriting captions, resizing videos,
or separately preparing each platform.

Unsupported channels must be clearly identified rather than bypassed.

The system must be:

``` text
provider-agnostic
cost-aware
queue-based
idempotent
secure
auditable
multi-workspace
multi-channel
human-review capable
```

and ready to add new AI/video/social providers without changing the core
campaign model.
