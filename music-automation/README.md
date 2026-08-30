# music-automation

Turns InnoVexis Consulting / Dare to Law founder stories into songs, fully
automatically: **lyrics → AI music + vocals → lyric video → YouTube +
LinkedIn/Instagram/etc**, with review notifications on Slack, email, and/or
WhatsApp, and one optional human checkpoint before anything goes public.

**Every tool in the default configuration is free** -- no credit card, no
paid plan, anywhere. See "Cost optimization" below for the complete
breakdown and the one thing that genuinely can't be made free (SoundCloud,
optional and off by default).

```
Source theme ("Dare to Law", "Innovexsis Consulting")
  -> Lyrics (free LLM -- Groq by default, no credit card)
  -> Music + vocals (free, open-source -- ACE-Step, self-hosted or the free public HF Space)
  -> Cover art (sharp, local) + lyric video (ffmpeg, local)
  -> [ Slack / email / WhatsApp notification -- the one human checkpoint, skippable ]
  -> YouTube (direct API, free)
  -> LinkedIn / Instagram / X / Facebook / TikTok / etc (Buffer free plan, or self-hosted Postiz)
  -> SoundCloud (optional, the one channel that needs a paid subscription)
```

Every stage is behind a small interface (`MusicProvider`, `SocialPublisher`,
`LyricsClient`, `YoutubeClient`) so you can swap providers without touching
the orchestrator, and every external call is unit-tested against a mocked
HTTP layer -- see "Testing" below. The music provider was additionally
**verified against the live production service** (not just mocked) --
see "How the free music generation actually works".

---

## Quick start

```bash
cd music-automation
npm install
cp .env.example .env   # fill in the keys you have; every default is free
npm run cli -- seed "Dare to Law"
npm run pipeline:run
npm run cli -- status
```

With `AUTO_APPROVE=false` (the default), a song will stop at `pending_review`
and wait for `npm run cli -- approve <songId>` (or the GitHub Actions
"Run workflow" button, once deployed -- see below). With `AUTO_APPROVE=true`,
`npm run pipeline:run` alone takes a song all the way to `published` with
**zero commands after the first one**.

---

## How the free music generation actually works

[ACE-Step](https://github.com/ace-step/ACE-Step) is a real, open-source
(Apache-2.0) foundation model that generates full songs -- vocals,
instrumentation, structure -- from lyrics and style tags, and runs fast
enough (under 10s per song on a consumer GPU) to be genuinely usable.
Unlike Suno/Udio, it has no closed API and no subscription.

By default this pipeline calls ACE-Step's **official public Hugging Face
Space**, which runs on HF's shared free "ZeroGPU" compute -- no signup, no
API key, no per-call cost. This isn't a theoretical claim: it was tested
live against production during this build --

```
$ curl -X POST ".../gradio_api/call/__call__" -d '{"data": [...]}'
{"event_id":"3d673afa..."}
$ curl -N ".../gradio_api/call/__call__/3d673afa..."
event: complete
data: [{"url": ".../output.mp3", ...}, {"timecosts": {"diffusion": 2.397, ...}}]
```

...which produced a real, valid 320kbps mp3 in about 7 seconds, for $0.
`AceStepMusicProvider` (`src/pipeline/music-providers/acestep-provider.ts`)
implements exactly that request/response protocol, with the exact
22-parameter payload order pulled from the live Space's own component
schema (not guessed).

**The honest tradeoffs of the free public Space:**
- It's a shared community resource with no uptime/latency SLA -- it can
  queue behind other users, and its maintainer could change the UI (and
  therefore silently change this parameter order) at any time.
- For guaranteed availability and no queueing, **self-host ACE-Step**
  instead -- same HTTP protocol, just point `ACE_STEP_BASE_URL` at your own
  GPU machine running ACE-Step's own Gradio app (`python app.py` from the
  [ACE-Step repo](https://github.com/ace-step/ACE-Step), or the faster
  [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) which needs
  under 4GB VRAM and runs in seconds even on a gaming GPU). This is the
  same "point the app at your own GPU server" pattern the
  `Open-Generative-AI` repo you linked already uses for its own Wan2GP
  video backend -- same idea, applied to music.
- Setting `HF_TOKEN` (free -- create one at
  huggingface.co/settings/tokens) improves rate limits on the shared Space
  without costing anything.

### About the repository you linked (`Anil-matcha/Open-Generative-AI`)

Worth being direct about this rather than quietly ignoring it: that repo
is real and its image/video UI code is genuinely MIT-licensed and
self-hostable, but **it is not a free path to music generation** for this
use case, for two reasons:

1. Every generation call in that app -- including its "Audio Studio" --
   goes through **Muapi.ai**, a paid, metered API gateway (bring-your-own
   Muapi key; the README's own "free" framing is about the UI code being
   open source, not the model calls being free). It also actively upsells
   a $49+/mo "White Label" resale product.
2. Its one genuinely free feature, local model inference (`sd.cpp` /
   Wan2GP running on your own GPU), is explicitly **image- and
   video-only** -- there's no local/free path for its Audio Studio at all.

So it doesn't replace anything here; ACE-Step (a different, standalone
open-source project) is the actual free music-generation answer, and is
what this pipeline uses.

---

## Automation completeness -- what's *actually* unattended

| Stage | Automatable today? | The one human action required, and when |
|---|---|---|
| Lyrics (free LLM) | **100%** | None, ever, once an API key exists (free signup, no card). |
| Music + vocals (ACE-Step) | **100%** | None, ever -- no signup at all against the default public Space. |
| Cover art + video (sharp/ffmpeg, local) | **100%** | None, ever -- no external API at all. |
| YouTube publish | **100%** after setup | One-time OAuth consent click (`npm run oauth:youtube`) when the channel is first connected. Refresh tokens don't expire from age, only revocation. |
| LinkedIn/Instagram/etc via Buffer or Postiz | **100%** after setup | One-time "Connect" click per channel, in the Buffer or Postiz UI, when each channel is first connected. This is every platform's own OAuth security model -- no tool, including this one, can remove that first click without storing your password (which this project deliberately never does). |
| SoundCloud | Optional, off by default | Requires a paid Artist Pro subscription -- the one channel with no free path. Skip it (default) or pay for it; your call. |
| Review notifications (Slack/email/WhatsApp) | **100%**, any/all/none | One-time setup per channel you enable; see below. |
| Human review gate | **Optional by design** | Exactly one click (notification link -> GitHub "Run workflow" button) per song, unless `AUTO_APPROVE=true`, in which case zero. |

**Bottom line:** after the one-time setup per platform (which is inherent
to how OAuth security works everywhere, not a gap in this tool), the
recurring, ongoing operation is **100% unattended** with `AUTO_APPROVE=true`,
or **one click per song** with the review gate on (recommended -- see
below for why).

### Should you actually turn on `AUTO_APPROVE`?

Even a single tap of approval before publish prevents an off-brand lyric or
a broken render from going out under your name with nobody catching it --
and it's cheap insurance: one click, no server to keep running for it (see
the GitHub Actions design below). Recommendation: run with the gate **on**
for the first several songs while you dial in prompt quality, then flip to
`AUTO_APPROVE=true` once you trust the output consistently.

---

## Review notifications: Slack, email, WhatsApp (any, all, or none)

All three are wired into the same `notifyForReview` call
(`src/pipeline/5-notify-review.ts`) and each is independently a no-op when
not configured -- turn on whichever you actually want.

### Slack (already covered, unchanged)
`api.slack.com/apps` → Create app → Incoming Webhooks → get a webhook URL
→ `SLACK_WEBHOOK_URL`. Free, no caveats.

### Email (free SMTP -- pick whichever you already have)

| Provider | Free tier | `SMTP_HOST` | Notes |
|---|---|---|---|
| Gmail | Effectively unlimited for personal notification volume | `smtp.gmail.com` (port 587) | Use a Google Account **App Password**, not your real password -- Google Account → Security → 2-Step Verification → App Passwords |
| Zoho Mail Free | Free forever, own domain supported | `smtp.zoho.com` (port 587) | |
| Brevo | 300 emails/day free | `smtp-relay.brevo.com` (port 587) | |
| Resend | 3,000 emails/month free | `smtp.resend.com` (port 465) | |

Set `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`EMAIL_FROM`, `EMAIL_TO`. At the volume this pipeline runs (a few
notifications a week), every option above is genuinely $0.

### WhatsApp (Meta's official Cloud API)

The **API itself has no platform fee** -- this is not a paid product to
turn on. The one nuance worth being upfront about: Meta only lets you send
a plain, unprompted notification for free if the recipient messaged your
WhatsApp Business number within the last 24 hours (an "open service
window"). Outside that window, an unprompted business-initiated message is
billed as a "utility" template at a small per-message rate (about
$0.003-0.004 in the US, higher in some markets -- see
[Meta's pricing page](https://developers.facebook.com/docs/whatsapp/pricing/)
for your market). At this pipeline's volume that's a handful of cents a
year, not a real budget line -- but it is not literally $0.00, so it's
called out plainly rather than oversold as free.

**Genuinely free workaround, if you want exactly $0:** message your own
WhatsApp Business number once a day (even just "status") -- that opens a
free 24h window during which every reply from the bot is free. Otherwise,
just accept the fractional-cent template cost; it's negligible either way.

Setup: [developers.facebook.com](https://developers.facebook.com) → create
an app → add the "WhatsApp" product → get a **temporary access token +
phone number ID** for testing, or complete Business verification for a
permanent token. Set `WHATSAPP_ENABLED=true`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TO_NUMBER` (your own number, in
international format with no `+` or spaces, e.g. `15551234567`).

---

## Hosting: where this actually runs

You asked to try Cursor Cloud first. Here's the honest assessment, plus
what to use instead.

### Option 1: Cursor Cloud (attempted, not recommended as the primary host)

Cursor's scheduled-agent feature ("Automations", `cursor.com/automations`)
*can* technically run this: a Cloud Agent VM is a real, internet-connected
Ubuntu box with a terminal, secrets, and no run-mode approval gate, so it
could `npm run pipeline:run` on a cron trigger. But per Cursor's own
documentation:

- **It's billed like any Cloud Agent run** -- LLM-token-metered, at the
  selected model's rate, with no flat/predictable price for a recurring
  job, and no free tier (Automations need Pro or higher) -- notably, this
  is itself a **paid** hosting option, the opposite of everything else in
  this build.
- **No persistent storage between runs** beyond git + a small `MEMORIES.md`
  text file -- fine for our git-committed `data/songs.json`, but there's no
  hosted place for the generated audio/video to live between runs.
- **No timing SLA** -- "may run with a delay but will not start before the
  indicated time."
- Every documented use case for Automations is dev-workflow-centric (PR
  review, CI-failure fixing, incident triage) -- there's no template or
  guidance for hosting a production media/publishing pipeline.

**Conclusion:** technically possible, but it's the one *paid* hosting
option on this list, which is the opposite of what you asked for this
round -- use Option 2 instead.

### Option 2: GitHub Actions (recommended primary host -- $0, already set up)

`.github/workflows/music-automation-cron.yml` runs `npm run pipeline:run`
on an hourly schedule. This is genuinely free forever on a **public**
repo -- GitHub Actions minutes on public repos aren't billed against your
account's Actions-minutes quota at all, independent of billing status.
(This repo is already public, and this exact pattern -- a public repo
specifically so its scheduler never gets blocked by a billing issue -- is
what `lovable-audit-scheduler` in this account already does. Same idea,
reused.)

Setup:
1. Add repository **secrets** (Settings -> Secrets and variables -> Actions
   -> Secrets) for every credential in `.env.example`.
2. Add repository **variables** (same page, "Variables" tab) for the
   non-secret toggles (`SOCIAL_PUBLISHER`, `AUTO_APPROVE`, `SOURCE_THEMES`,
   `EMAIL_ENABLED`, `WHATSAPP_ENABLED`, etc).
3. Done -- the workflow is already committed. Trigger it once by hand from
   the Actions tab ("Run workflow") to verify before waiting for the
   schedule.

Generated audio/video is uploaded as a workflow **artifact** (30-day
retention) rather than committed to git, so the repo doesn't bloat over
time; only the lightweight `data/songs.json` state file is committed back
between runs.

### Option 3: free, self-hosted alternative (if you'd rather not depend on GitHub Actions)

Run the exact same code as an always-on process instead of a scheduled
job, on a VM you fully control, for $0/month indefinitely -- and this is
also where you'd self-host ACE-Step if you want a dedicated GPU instead of
the shared public Space:

1. **Oracle Cloud "Always Free" tier** -- currently the most generous
   perpetual free compute available: up to 2 OCPUs / 12 GB RAM (ARM
   Ampere), no expiration, no spend cap surprise. (Render/Railway/Fly.io
   all *used* to have usable free tiers for an always-on worker; as of
   2026 none of them do any more.) Note: the Always Free ARM tier has **no
   GPU**, so it's a good fit for the pipeline daemon and self-hosted
   Postiz, but not for self-hosting ACE-Step at speed -- for that you'd
   want your own GPU machine (even a gaming PC) as a `ACE_STEP_BASE_URL`
   target, same BYO-GPU-server pattern as the linked repo's Wan2GP option.
2. On the always-free VM: `git clone` this repo, `cd music-automation`,
   `npm install`, `npm run pipeline:daemon` (the `node-cron`-based
   always-on variant -- see `src/orchestrator/daemon.ts`) under `systemd`
   or `pm2` so it survives reboots.
3. Optionally run **self-hosted Postiz** (see below) on the *same* free VM
   via Docker Compose, so the whole stack -- pipeline + social scheduler --
   costs $0/month with nothing rented from anyone.

This is the same "public repo scheduler + always-on VM runner" pattern
already used elsewhere in this account (`innovexsis-grant-runner` ships
both a GitHub Actions workflow *and* a `systemd` unit / Fly.io deploy for
the same job) -- Option 2 and Option 3 here are that same choice, applied
to this pipeline.

---

## Social publishing: Buffer vs. self-hosted Postiz (both free)

`SOCIAL_PUBLISHER` picks between two real, working, **free** options:

| | **Buffer** (`SOCIAL_PUBLISHER=buffer`, default) | **Postiz, self-hosted** (`SOCIAL_PUBLISHER=postiz`) |
|---|---|---|
| Cost | **$0** -- free plan, personal API key, 3,000 requests/30 days | **$0** -- AGPL-3 open source, run it yourself |
| Setup effort | Low -- sign up, connect channels in the UI, copy an API key | Medium -- `docker compose up` on a VM (e.g. the same Oracle free instance above), register a developer app per platform for OAuth |
| Platforms | LinkedIn, Instagram, X, Facebook, YouTube, Pinterest, Threads, Bluesky, Google Business Profiles | 25+, incl. everything Buffer supports plus TikTok, Reddit, Mastodon, Discord, Slack, dev.to |
| Who's in the loop long-term | Buffer (a company whose free-tier terms could change) | You -- your data, your infra, no vendor free-tier risk |

Both need each destination channel "Connect"-ed once via OAuth in that
tool's own UI -- see the automation-completeness table above for why that
one click can't be automated away.

We deliberately did **not** use **Ayrshare**, despite it being the most
commonly recommended "unified social API": as of 2026 it has no permanent
free tier at all (a 28-day trial, then **$149/month minimum** for a single
profile). For this use case -- one brand, its own channels -- that buys
nothing Buffer's free plan or self-hosted Postiz don't already cover for
$0.

---

## Cost optimization -- what this now actually costs: $0

| Line item | Choice | What it costs |
|---|---|---|
| Hosting/orchestration | GitHub Actions on this public repo | **$0** |
| Database | Local JSON file, committed by CI (or free-tier Neon Postgres) | **$0** |
| Lyrics | Groq free tier (`llama-3.3-70b-versatile`), no credit card | **$0** |
| Music + vocals | ACE-Step via the free public Hugging Face Space (ZeroGPU) | **$0** |
| Video/cover art | ffmpeg + sharp, both local, no API | **$0** |
| YouTube | Official API | **$0** |
| LinkedIn/Instagram/etc | Buffer free plan, or self-hosted Postiz | **$0** |
| Review notifications | Slack webhook (free) + free SMTP email + WhatsApp Cloud API (free access; ~$0.003-0.004 per unprompted message, avoidable -- see above) | **$0**, or a few cents/year if you skip the WhatsApp free-window trick |
| SoundCloud (optional, off by default) | Skip it, or pay for Artist Pro if you specifically want this one channel | **$0 if skipped** (the only paid line item in this entire build, and it's opt-in) |

**Net effect:** with the defaults in `.env.example`, running this pipeline
costs **$0/month**, full stop -- infra, generation, distribution, and
notifications all included. The only way to spend money anywhere in this
build is to explicitly opt into SoundCloud, which requires its own paid
subscription with no substitute (that's a platform-imposed constraint, not
an engineering gap).

If you later *do* have budget and want higher-fidelity music (guaranteed
low-latency, no shared-GPU queueing, or simply better perceived quality),
the same `MusicProvider` interface that makes ACE-Step swappable also
makes it easy to add a paid provider back in later without touching the
orchestrator -- but nothing here requires that.

---

## Portability: dropping this into your other repositories

This folder is intentionally self-contained: its own `package.json`,
`tsconfig.json`, `.env.example`, `.gitignore`, and no imports that reach
outside `music-automation/`. To reuse it in another repo:

```bash
cp -r music-automation /path/to/other-repo/music-automation
cp .github/workflows/music-automation-cron.yml /path/to/other-repo/.github/workflows/
cp .github/workflows/music-automation-approve.yml /path/to/other-repo/.github/workflows/
cd /path/to/other-repo/music-automation && npm install
```

Then set that repo's own secrets/variables and go. Nothing here assumes
Supabase, this account's other tooling, or any specific host.

### On "connecting with all your GitHub repositories"

The GitHub credentials available to this agent only see **6** repositories
under `vivekearthz` (`pulse`, `innovexsis-grant-runner`,
`innovexsis-portfolio`, `lovable-audit-scheduler`,
`AI_Influencer_Video_Automation_Lovable_Implementation.md`, and a fork,
`Myomnibridge`) -- a Cursor GitHub App permissions-scope issue (Settings ->
Applications -> Installed GitHub Apps -> Cursor -> Configure -> grant
access to more repos, if you want a future agent to act on them directly).

Within that scope, though, one concrete connection was made: **your own
`Myomnibridge` repo** -- a unified, OpenAI-compatible LLM gateway you
already built, with automatic failover across 16+ providers including
several genuinely free ones (Groq, Gemini, Cerebras, and more) -- is a
drop-in replacement for the default Groq endpoint here. Deploy it (it's
built for Vercel's free tier) and point `LYRICS_API_BASE_URL` at your
deployment's `/api/v1` URL instead of Groq's directly; nothing else
changes, since both speak the same OpenAI-compatible chat-completions
schema.

---

## Attaching files (the "MP file" question, from an earlier round)

The build spec you attached to the original task arrived as a normal chat
attachment, saved to this agent's filesystem automatically, then read and
implemented directly -- that mechanism already works exactly as you'd
want. For any future task: attach a file the same way (paperclip /
drag-and-drop) and reference it in your prompt.

If you specifically want to hand over an `.mp3` as a **style reference**
for generated songs (rather than a spec document): ACE-Step's public Space
supports an "Audio2Audio" reference-audio input (see the `Enable
Audio2Audio` / `Reference Audio` / `Refer audio strength` parameters in
`acestep-provider.ts`) -- currently wired to `false`/unset by default.
Attach the MP3 the same way as any file, tell the agent where it landed,
and it can wire that file into the reference-audio parameters already
present in the provider's request payload.

---

## Testing

```bash
npm test          # full suite, ~1-2s
npm run typecheck
```

31 tests, all passing, covering:
- Lyrics parsing/generation against a fake LLM client, including malformed
  responses, plus a dedicated test of `OpenAICompatibleLyricsClient`'s
  actual HTTP request shape (works identically against Groq, OmniBridge,
  or any OpenAI-compatible provider).
- `AceStepMusicProvider`'s exact request payload (22 parameters, verified
  against the live public Space's own component schema) and SSE-stream
  response parsing, including a **real captured `event: complete` payload**
  from an actual live generation run during this build, plus error-path
  handling.
- **Real** cover-art generation (`sharp`) and **real** ffmpeg video
  rendering end-to-end (no mocks -- an actual mp4 is produced from a
  generated PNG and a generated silent audio track).
- `BufferPublisher` / `PostizPublisher` request construction and error
  surfacing, against mocked HTTP.
- `SoundCloudPublisher` multipart upload construction.
- Slack / email / WhatsApp notifiers: each independently a no-op when
  unconfigured, each sending the right payload when enabled.
- The full state machine, end-to-end, twice: once proving a song correctly
  **stops** at `pending_review` and waits for a human when the gate is on,
  and once proving a song goes all the way to `published` with **zero**
  human input when `AUTO_APPROVE=true` -- plus a third test proving a
  broken stage is marked `failed` with the error recorded, never left
  silently stuck.

Beyond the mocked test suite, the music provider was also run for real
against the live public ACE-Step Space during development (both via raw
`curl` and via the actual `AceStepMusicProvider` class) -- see git history
for the exact commands and captured output.

## Repository layout

```
music-automation/
├── src/
│   ├── config/env.ts              # zod-validated env loading
│   ├── db/                        # JSON-file (default) + Postgres repositories
│   ├── pipeline/
│   │   ├── 1-generate-lyrics.ts   # OpenAICompatibleLyricsClient (Groq default)
│   │   ├── 2-generate-music.ts
│   │   ├── music-providers/       # AceStepMusicProvider (free, only provider)
│   │   ├── 3-generate-video.ts
│   │   ├── cover-art.ts           # sharp, no API
│   │   ├── 4-publish-youtube.ts
│   │   ├── 4-publish-soundcloud.ts
│   │   ├── social-publishers/     # Buffer (default) / Postiz (self-hosted)
│   │   ├── notifiers/             # slack.ts / email.ts / whatsapp.ts
│   │   └── 5-notify-review.ts     # fans out across configured notifiers
│   ├── orchestrator/
│   │   ├── state-machine.ts       # advances one song one stage
│   │   ├── run-once.ts            # GitHub Actions entrypoint
│   │   ├── daemon.ts              # always-on/self-hosted entrypoint
│   │   └── seed.ts                # auto-queues a new song per theme on a timer
│   └── cli.ts                     # seed / status / approve / reject
├── scripts/
│   ├── youtube-oauth.mjs          # one-time refresh-token setup
│   └── soundcloud-oauth.mjs       # one-time refresh-token setup (optional channel)
├── test/                          # vitest, 31 tests
└── .env.example
```
