# music-automation

Turns InnoVexis Consulting / Dare to Law founder stories into songs, fully
automatically: **lyrics → AI music + vocals → lyric video → YouTube +
LinkedIn/Instagram/etc → (optional) SoundCloud**, with one deliberate,
optional human checkpoint before anything goes public.

This implements the uploaded build spec, updated against the real state of
every third-party API as of August 2026 (several things changed since that
spec was written -- see "What changed from the original spec" below), and
adapted to run as a **self-contained, copy-anywhere module** rather than a
service tied to one repo's infrastructure.

```
Source theme ("Dare to Law", "Innovexsis Consulting")
  -> Lyrics (Anthropic Claude, structured JSON)
  -> Music + vocals (ElevenLabs Music API)
  -> Cover art (sharp, local) + lyric video (ffmpeg, local)
  -> [ Slack notification -- the one human checkpoint, skippable ]
  -> YouTube (direct API)
  -> LinkedIn / Instagram / X / Facebook / TikTok / etc (Buffer or self-hosted Postiz)
  -> SoundCloud (optional, needs an Artist Pro subscription)
```

Every stage is behind a small interface (`MusicProvider`, `SocialPublisher`,
`LyricsClient`, `YoutubeClient`) so you can swap providers without touching
the orchestrator, and every external call is unit-tested against a mocked
HTTP layer -- see "Testing" below.

---

## Quick start

```bash
cd music-automation
npm install
cp .env.example .env   # fill in the keys you have; see below for what's required per stage
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

## What changed from the original spec (things move fast -- verified Aug 2026)

The uploaded spec called out two stages as "not fully automatable" and
flagged Suno/Udio's API status as uncertain. Re-checking every one of those
against current provider documentation changed the recommended design:

| Spec's assumption | Current reality (Aug 2026) | What this build does |
|---|---|---|
| Suno API "check current access before building" | Still no public self-serve API. Suno opened a partner-program *intake form* in July 2026, curated access only, no docs/pricing/timeline. Third-party "Suno API" products are unofficial wrappers with real ToS risk. | **ElevenLabs Music API** (`POST /v1/music`) is the default -- a real, documented, ToS-compliant, production API. Suno is wired in as an explicitly-disabled `SunoExperimentalProvider` you'd have to opt into by hand. |
| Buffer/Make.com for LinkedIn+Instagram | Buffer's *old* REST API closed new developer registration in 2019 -- but Buffer shipped a *new* GraphQL API in 2026, free on every plan (1 personal API key, 3,000 requests/30 days), covering LinkedIn, Instagram, X, Facebook, YouTube, Pinterest, Threads, Bluesky, Google Business Profiles. | `BufferPublisher` uses that new API directly. No Make.com/Zapier hop needed. |
| SoundCloud "no dependable path to full automation, plan for manual" | SoundCloud opened a genuinely self-service developer portal in 2026 -- you can generate a Client ID/Secret yourself instantly, **if** you hold an active Artist Pro subscription. | `SoundCoudPublisher`/`publishToSoundcloud` implements the real upload API, gated behind `SOUNDCLOUD_ENABLED` (off by default, since it has a real subscription cost -- your call whether it's worth it per "Cost optimization" below). |

This is exactly the kind of drift the spec itself warned about ("don't let
the developer discover this three weeks in") -- so treat every provider
integration here the same way: as correct today, and worth re-verifying
against live docs before it's been sitting untouched for months.

---

## Automation completeness -- what's *actually* unattended

| Stage | Automatable today? | The one human action required, and when |
|---|---|---|
| Lyrics (Anthropic) | **100%** | None, ever. |
| Music + vocals (ElevenLabs) | **100%** | None, ever (once a paid plan + API key exist). |
| Cover art + video (sharp/ffmpeg, local) | **100%** | None, ever -- no external API at all. |
| YouTube publish | **100%** after setup | One-time OAuth consent click (`npm run oauth:youtube`) when the channel is first connected. Refresh tokens don't expire from age, only revocation. |
| LinkedIn/Instagram/etc via Buffer or Postiz | **100%** after setup | One-time "Connect" click per channel, in the Buffer or Postiz UI, when each channel is first connected. This is every platform's own OAuth security model -- no tool, including this one, can remove that first click without storing your password (which this project deliberately never does). |
| SoundCloud | **100%** after setup, **if** you keep Artist Pro | One-time OAuth consent (`npm run oauth:soundcloud`), same shape as YouTube's. If you don't want the subscription, leave `SOUNDCLOUD_ENABLED=false` and treat it as a manual/distributor step, as the original spec suggested. |
| Human review gate | **Optional by design** | Exactly one click (Slack link -> GitHub "Run workflow" button) per song, unless `AUTO_APPROVE=true`, in which case zero. |

**Bottom line:** after the one-time setup per platform (which is inherent
to how OAuth security works everywhere, not a gap in this tool), the
recurring, ongoing operation is **100% unattended** with `AUTO_APPROVE=true`,
or **one click per song** with the review gate on (recommended -- see
below for why).

### Should you actually turn on `AUTO_APPROVE`?

The spec's own words: *"Even a single tap of approval before publish
prevents an off-brand lyric or a broken render from going out under your
name with nobody catching it."* That's still true, and it's cheap insurance
-- one click, no server to keep running for it (see the GitHub Actions
design below). Recommendation: run with the gate **on** for the first
several songs while you dial in prompt quality, then flip to
`AUTO_APPROVE=true` once you trust the output consistently.

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
  job, and no free tier (Automations need Pro or higher).
- **No persistent storage between runs** beyond git + a small `MEMORIES.md`
  text file -- fine for our git-committed `data/songs.json`, but there's no
  hosted place for the generated audio/video to live between runs.
- **No timing SLA** -- "may run with a delay but will not start before the
  indicated time."
- **Default network egress allowlist doesn't include consumer APIs** like
  ElevenLabs/YouTube/Buffer -- you'd need to explicitly widen it.
- Every documented use case for Automations is dev-workflow-centric (PR
  review, CI-failure fixing, incident triage) -- there's no template or
  guidance for hosting a production media/publishing pipeline, and
  Cursor's docs frame skipping the draft-PR safety gate (needed for
  unattended runs) as *increasing* risk, not a recommended production
  pattern.

**Conclusion:** technically possible, not a good fit for a deterministic,
cost-predictable, always-there production job. If you still want to try
it as a convenience trigger (e.g. "run this on demand from my phone via
the Cursor app"), create an Automation at `cursor.com/automations` with:

- **Trigger:** Scheduled (cron) or manual
- **Repo:** this one, branch `main`
- **Prompt:** `Run cd music-automation && npm ci && npm run pipeline:run, using the repository's configured secrets. Do not open a PR; just report the resulting song statuses.`
- **Pull request creation tool:** disabled (so it doesn't try to open a PR for a non-code change)

...but point the real schedule at Option 2.

### Option 2: GitHub Actions (recommended primary host -- $0, already set up)

`.github/workflows/music-automation-cron.yml` runs `npm run pipeline:run`
on an hourly schedule. This is genuinely free forever on a **public**
repo -- GitHub Actions minutes on public repos aren't billed against your
account's Actions-minutes quota at all, independent of billing status.
(This repo is already public, and this exact pattern -- a public repo
specifically so its scheduler never gets blocked by a billing issue -- is
what `lovable-audit-scheduler` in this account already does. Same idea,
reused.)

Why this beats a persistent daemon here: the pipeline is naturally a
"wake up, do the work that's due, exit" job (lyrics/music/video generation
and publishing are all single request/response calls, not long-running
processes), which is exactly what a scheduled Action is for, and it needs
zero server maintenance.

Setup:
1. Add repository **secrets** (Settings -> Secrets and variables -> Actions
   -> Secrets) for every credential in `.env.example`.
2. Add repository **variables** (same page, "Variables" tab) for the
   non-secret toggles (`MUSIC_PROVIDER`, `SOCIAL_PUBLISHER`, `AUTO_APPROVE`,
   `SOURCE_THEMES`, etc).
3. Done -- the workflow is already committed. Trigger it once by hand from
   the Actions tab ("Run workflow") to verify before waiting for the
   schedule.

Generated audio/video is uploaded as a workflow **artifact** (30-day
retention) rather than committed to git, so the repo doesn't bloat over
time; only the lightweight `data/songs.json` state file is committed back
between runs.

### Option 3: free, self-hosted alternative (if you'd rather not depend on any of the above)

Run the exact same code as an always-on process instead of a scheduled
job, on a VM you fully control, for $0/month indefinitely:

1. **Oracle Cloud "Always Free" tier** -- currently the most generous
   perpetual free compute available: up to 2 OCPUs / 12 GB RAM (ARM
   Ampere), no expiration, no spend cap surprise. (Render/Railway/Fly.io
   all *used* to have usable free tiers for an always-on worker; as of
   2026 none of them do any more -- Railway removed its free tier in
   2023, Fly.io ended free allowances for new accounts in Oct 2024, and
   Render's free web services cold-start and its free Postgres
   hard-expires after 30 days. Oracle remains the real "free forever"
   option for this shape of workload.)
2. On that VM: `git clone` this repo, `cd music-automation`,
   `npm install`, `npm run pipeline:daemon` (the `node-cron`-based
   always-on variant -- see `src/orchestrator/daemon.ts`) under `systemd`
   or `pm2` so it survives reboots.
3. Optionally run **self-hosted Postiz** (see below) on the *same* free VM
   via Docker Compose, so the whole stack -- pipeline + social scheduler --
   costs $0/month with nothing rented from anyone.

This is the same "public repo scheduler + Fly.io/systemd always-on runner"
pattern already used elsewhere in this account (`innovexsis-grant-runner`
ships both a GitHub Actions workflow *and* a `systemd` unit / Fly.io
deploy for the same job) -- Option 2 and Option 3 here are that same choice,
applied to this pipeline.

---

## Social publishing: Buffer vs. self-hosted Postiz (free)

`SOCIAL_PUBLISHER` picks between two real, working options -- pick based on
how much you want to self-host vs. pay for convenience:

| | **Buffer** (`SOCIAL_PUBLISHER=buffer`, default) | **Postiz, self-hosted** (`SOCIAL_PUBLISHER=postiz`) |
|---|---|---|
| Cost | **$0** -- free plan, personal API key, 3,000 requests/30 days | **$0** -- AGPL-3 open source, run it yourself |
| Setup effort | Low -- sign up, connect channels in the UI, copy an API key | Medium -- `docker compose up` on a VM (e.g. the same Oracle free instance above), register a developer app per platform for OAuth |
| Platforms | LinkedIn, Instagram, X, Facebook, YouTube, Pinterest, Threads, Bluesky, Google Business Profiles | 25+, incl. everything Buffer supports plus TikTok, Reddit, Mastodon, Discord, Slack, dev.to |
| Who's in the loop long-term | Buffer (a company whose free-tier terms could change) | You -- your data, your infra, no vendor free-tier risk |
| Third-party OAuth for many end users | Not available on the new API yet | Available (this is what it's built for) |

Both need each destination channel "Connect"-ed once via OAuth in that
tool's own UI -- see the automation-completeness table above for why that
one click can't be automated away.

We deliberately did **not** default to **Ayrshare**, despite it being the
most commonly recommended "unified social API": as of 2026 it has no
permanent free tier at all (a 28-day trial, then **$149/month minimum** for
a single profile). For this use case -- one brand, its own channels -- that
buys nothing Buffer's free plan or self-hosted Postiz don't already cover
for $0.

---

## Cost optimization -- what this is actually going to cost you

Target: **$0 in infrastructure, minimum unavoidable spend on generation
APIs.**

| Line item | Default choice | Why it's the cheap option | What it costs |
|---|---|---|---|
| Hosting/orchestration | GitHub Actions on this public repo | Free regardless of billing status; no server to patch or pay for | **$0** |
| Database | Local JSON file, committed by CI | No hosted DB needed at all | **$0** (or use free-tier Neon Postgres if you want a "real" DB -- 10 projects, 191 CU-hrs/mo, still $0) |
| Lyrics (Anthropic) | `claude-haiku-4-5` (cheapest current Claude model) instead of a frontier model | Structured JSON lyric-writing doesn't need frontier reasoning; this is the single biggest lever on this line item | **cents per song** |
| Music + vocals (ElevenLabs Music API) | Cheapest ElevenLabs paid plan that includes Music API access | Unavoidable -- no free, ToS-compliant music-generation API exists | **This is the real recurring cost.** Budget by plan tier, not per-call; the `MAX_SONGS_PER_RUN` / `MAX_MONTHLY_COST_CENTS` guardrails in `.env.example` cap the blast radius of a runaway loop |
| Video/cover art | ffmpeg + sharp, both local, no API | Zero marginal cost no matter how many songs run | **$0** |
| YouTube | Official API | Free, no quota cost for uploads at this volume | **$0** |
| LinkedIn/Instagram/etc | Buffer free plan, or self-hosted Postiz | See comparison above -- avoid Ayrshare's $149+/mo entirely | **$0** |
| SoundCloud (optional) | Skip it (`SOUNDCLOUD_ENABLED=false`) unless you specifically want it | Artist Pro subscription is a real recurring cost for one distribution channel | **$0 if skipped**, ~subscription cost if enabled |

**Net effect:** the only line item you can't get to $0 is the AI music
generation call itself -- which is the one part of this whole pipeline that
is, definitionally, the product. Everything else -- hosting, database,
video rendering, YouTube, and social scheduling -- is free by construction
in this build.

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

### A note on "all 23 of your repositories"

The GitHub credentials available to this agent only had visibility into
**6** repositories under `vivekearthz` at the time of writing (`pulse`,
`innovexsis-grant-runner`, `innovexsis-portfolio`,
`lovable-audit-scheduler`, `AI_Influencer_Video_Automation_Lovable_Implementation.md`,
and a fork, `Myomnibridge`) -- not 23. That's a permissions scope issue,
not a search miss: the Cursor GitHub App is only authorized against
repositories that explicitly granted it access. None of the 6 visible
repos contained an existing music-generation pipeline to build on (the
closest precedent is this same repo's existing 24-channel video/social
publishing platform, whose patterns -- provider abstraction, human-approval
queue, cost guardrails, GitHub Actions cron alternative -- this module
deliberately mirrors).

**To let a future agent see and act on the rest of your repositories:**
GitHub -> Settings -> Applications -> Installed GitHub Apps -> Cursor ->
Configure -> grant access to "All repositories" (or add the specific
ones), or install the Cursor GitHub App on the org that holds them if
it's not on your personal account already.

---

## Attaching files (the "MP file" question)

Two different things this can mean, both worth covering:

**1. Attaching a spec/document (what already happened here).** The build
spec you attached to this task (`music-automation-build-spec.md`) arrived
as a normal chat attachment and was saved to this agent's filesystem
automatically, then read and implemented directly -- that's the whole
mechanism, and it already worked exactly as you'd want. For any future
task: attach a file the same way (paperclip / drag-and-drop in the Cursor
chat box, whether in the desktop app or when kicking off a Cloud Agent
task) and reference it in your prompt; the agent receives it on disk and
can read it like any other file. Works for `.md`, `.pdf`, images, and
audio.

**2. Attaching an actual `.mp3` as a style reference for the music itself.**
If what you meant is "let me hand you an MP3 and have the generated songs
sound like it": ElevenLabs Music v2 supports exactly this ("Audio
Reference" -- upload a ~30-second clip to steer sound/tempo/mood/production
style of a new generation; it does not copy or remix the source, and it
guides style rather than transforming genre). Attach the MP3 the same way
as any file (drag-and-drop / paperclip), tell the agent where you saved it
or what to do with it, and point `MUSIC_REFERENCE_AUDIO_PATH` in `.env` at
it. **One implementation note:** the exact request field for wiring an
uploaded reference clip into `POST /v1/music` wasn't nailed down in
ElevenLabs' public API reference as of this writing (the feature is
documented for the web product; the API-level parameter name needs a
quick check against `https://elevenlabs.io/docs/api-reference/music/compose`
before relying on it) -- `ElevenLabsMusicProvider` has the env var wired
through and a clearly marked extension point in
`src/pipeline/music-providers/elevenlabs-provider.ts` for exactly this,
flagged rather than guessed at, the same way the original spec flagged
"confirm actual endpoint" for Suno.

---

## Testing

```bash
npm test          # full suite, ~1-2s
npm run typecheck
```

21 tests, all passing, covering:
- Lyrics parsing/generation against a fake LLM client, including malformed
  responses.
- `ElevenLabsMusicProvider` request shape (composition plan built from
  lyrics sections) and error handling, against a mocked HTTP layer.
- `SunoExperimentalProvider` refusing to run without an explicitly vetted
  endpoint.
- **Real** cover-art generation (`sharp`) and **real** ffmpeg video
  rendering end-to-end (no mocks -- an actual mp4 is produced from a
  generated PNG and a generated silent audio track).
- `BufferPublisher` / `PostizPublisher` request construction and error
  surfacing, against mocked HTTP.
- `SoundCloudPublisher` multipart upload construction.
- The full state machine, end-to-end, twice: once proving a song correctly
  **stops** at `pending_review` and waits for a human when the gate is on,
  and once proving a song goes all the way to `published` with **zero**
  human input when `AUTO_APPROVE=true` -- plus a third test proving a
  broken stage is marked `failed` with the error recorded, never left
  silently stuck.

## Repository layout

```
music-automation/
├── src/
│   ├── config/env.ts              # zod-validated env loading
│   ├── db/                        # JSON-file (default) + Postgres repositories
│   ├── pipeline/
│   │   ├── 1-generate-lyrics.ts
│   │   ├── 2-generate-music.ts
│   │   ├── music-providers/       # ElevenLabs (default) / Suno (experimental)
│   │   ├── 3-generate-video.ts
│   │   ├── cover-art.ts           # sharp, no API
│   │   ├── 4-publish-youtube.ts
│   │   ├── 4-publish-soundcloud.ts
│   │   ├── social-publishers/     # Buffer (default) / Postiz (self-hosted)
│   │   └── 5-notify-review.ts
│   ├── orchestrator/
│   │   ├── state-machine.ts       # advances one song one stage
│   │   ├── run-once.ts            # GitHub Actions entrypoint
│   │   ├── daemon.ts              # always-on/self-hosted entrypoint
│   │   └── seed.ts                # auto-queues a new song per theme on a timer
│   └── cli.ts                     # seed / status / approve / reject
├── scripts/
│   ├── youtube-oauth.mjs          # one-time refresh-token setup
│   └── soundcloud-oauth.mjs       # one-time refresh-token setup
├── test/                          # vitest, 21 tests
└── .env.example
```
