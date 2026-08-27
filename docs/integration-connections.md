# Integration connections ledger

This file is the single source of truth for how this repository is wired up
to GitHub, Lovable, and Supabase. It exists so that "which repo/branch/project
is connected to what" is never tribal knowledge living only inside the
Lovable UI or someone's memory — it's versioned, reviewable, and machine
readable by `scripts/check-sync-health.mjs` (see
[`.github/workflows/sync-health-selfheal.yml`](../.github/workflows/sync-health-selfheal.yml)).

**Update this file whenever a Lovable project is connected/reconnected to a
branch, or a Supabase project is (re)linked.** The health-check workflow only
knows about what's listed here.

## Apps hosted in this repository

| App | Repo root for that app | GitHub branch Lovable should sync to | Supabase `project_id` (from `supabase/config.toml`) |
|---|---|---|---|
| AI Video Studio | `/` (repo root) | `main` | `ai-influencer-video-automation` |
| InfluenceOS | `/influenceos` (nested) on `main`; full copy at repo root on a dedicated branch | `cursor/influenceos-marketplace-root-d753` | `influenceos` |

Background: Lovable's GitHub sync only ever watches **one branch** per
project and always treats the **repository root** as "the app". Because this
GitHub repository hosts two unrelated apps, InfluenceOS is kept as a
root-level mirror on its own branch purely so a Lovable project can point at
it. See `README.md` → "Working with Lovable" for the full explanation.

## Known GitHub repositories under this account (as of the last audit)

The GitHub token available to this Cursor cloud agent is a repo-scoped
GitHub App installation token, limited to this one repository. It cannot
enumerate org-wide app installations, webhooks, or other accounts' settings.
The list below was captured with `gh repo list` and is a snapshot, not a
live source of truth — re-run it yourself if you need current data:

```bash
gh repo list <github-account> --limit 100 --json name,updatedAt,visibility
```

| Repository | Likely purpose |
|---|---|
| `AI_Influencer_Video_Automation_Lovable_Implementation.md` | This repo (AI Video Studio + InfluenceOS) |
| `innovexsis-grant-runner` | Innovexsis ecosystem app |
| `innovexsis-portfolio` | Innovexsis ecosystem app |
| `pulse` | Unknown — audit and fill in |
| `Myomnibridge` | Unknown — audit and fill in |

> The repo name above ends in `.md` — that's almost certainly an artifact of
> how it was first created (e.g. a spec file name leaking into the repo name
> on creation/import), not an intentional choice. A GitHub **rename** keeps
> the same repo ID and all history, and GitHub auto-redirects the old name,
> so it's safe to rename to something cleaner. A rename can still require
> Lovable to be **reconnected** afterward (see below) because Lovable stores
> its own reference to the repo.

## Why "Lovable GitHub 404 on reconnect" happens, and why no script can fix it end-to-end

Lovable's GitHub integration, GitHub's GitHub-App authorization, and
Supabase's project linking are three **independent** systems run by three
different companies. There is no API that lets one of them silently restore
another's broken authorization — that's by design: it's the same OAuth/
GitHub-App consent model that stops any third party (including an AI agent)
from re-authorizing access on an account owner's behalf. Concretely, a
persistent 404 when reconnecting is almost always one of:

1. **The Lovable GitHub App lost access to the repo/org** — it was
   uninstalled, the org switched "GitHub App access" from "All repositories"
   to "Only select repositories" and this repo wasn't re-added, or an org
   owner revoked it. Fix: account/org **Settings → Applications → Installed
   GitHub Apps → Lovable** → confirm it's installed and has this repository
   in its access list; reinstall/grant access if not.
2. **A stale repo reference inside Lovable** — the repo was renamed,
   transferred to a different owner, or deleted/recreated. GitHub keeps the
   old name working via redirects for normal git operations, but Lovable's
   stored `owner/repo` (or internal repo id) mapping can go stale, and its
   "reconnect" flow then 404s on that stale reference. Fix: in the Lovable
   project → **Settings → GitHub → Disconnect**, then **Connect to GitHub**
   again from scratch (don't rely on "reconnect" reusing the old link) and
   re-pick the repo and branch.
3. **Org SSO / SAML enforcement** blocking the Lovable App's token if your
   GitHub org requires SSO authorization per-app.
4. **A Lovable-side outage or bug** in the GitHub sync service itself. If
   step 2 above still 404s immediately after a clean disconnect + reconnect,
   this is the most likely remaining cause — it requires a fix on Lovable's
   backend, not anything doable from a repository or from GitHub's side.
   Contact Lovable support with the project ID, the exact repo URL, and a
   screenshot/HAR of the 404, and reference this failure mode explicitly.

None of the above can be resolved by a repo-side script, because none of the
broken state lives inside this repository. What **can** live in this
repository, and is set up below, is automated detection of the symptoms that
are visible from the GitHub side (missing/diverged branches, missing
required files at the sync root) plus a retrying, self-resetting alert loop
— so the *next* break is caught immediately instead of silently, even though
the *reconnect action itself* still has to be a human clicking through
GitHub's and Lovable's consent screens.

## Supabase

Each app has its own Supabase project (see table above). This repo does not
store Supabase project URLs or keys (by design — see `.env.example`). If you
want the health-check workflow to also verify Supabase reachability, add
repository secrets `SUPABASE_HEALTHCHECK_URL_<APP>` pointing at each
project's REST root (e.g. `https://<ref>.supabase.co/rest/v1/`) — the
workflow will pick up any secret matching that prefix automatically and skip
the check (not fail) when none are configured.

## Shared drive / external "master" documents

No shared Google Drive document is linked into this repository today, and
this Cursor agent had no authenticated access to Google Drive when this file
was written, so nothing could be imported from it automatically. If a shared
Drive doc is the intended source of truth for connection metadata, either:

- paste its contents into this file (preferred — keeps it versioned and
  diffable), or
- connect the Google Drive MCP integration for this workspace in Cursor
  settings so a future agent run can read it and merge it here.
