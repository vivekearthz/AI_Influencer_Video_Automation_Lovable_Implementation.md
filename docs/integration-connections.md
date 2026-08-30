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

## Known GitHub repositories under this account

The default GitHub token available to a Cursor cloud agent here is a
repo-scoped GitHub App installation token limited to this one repository —
it cannot enumerate org-wide app installations, webhooks, or other repos on
the account. Deliberately, this doc does **not** enumerate the account's
other repositories by name: this repo is **public**, most of the account's
other repos are **private** (project/client names), and listing them here
would leak that private information into a public file's git history. If
you need the current list, run this yourself (never paste the output back
into a committed file in this repo):

```bash
gh repo list <github-account> --limit 300 --json name,updatedAt,visibility
```

> This repo's name ends in `.md` — that's almost certainly an artifact of
> how it was first created (e.g. a spec file name leaking into the repo name
> on creation/import), not an intentional choice. A GitHub **rename** keeps
> the same repo ID and all history, and GitHub auto-redirects the old name,
> so it's safe to rename to something cleaner. A rename can still require
> Lovable to be **reconnected** afterward (see below) because Lovable stores
> its own reference to the repo.

## Account-wide audit findings (using a broader token, run manually)

The checks above are all that's possible with a repo-scoped token. When a
user-provided `GH_PERSONAL_ACCESS_TOKEN` with account-wide read access was
made available to a Cursor cloud agent (added via **Cursor Dashboard →
Cloud Agents → Secrets**, injected only as a VM environment variable — never
committed or logged), `scripts/audit-account-repos.mjs` could run the
diagnostics that were previously only theoretical. Run it yourself with:

```bash
GH_PERSONAL_ACCESS_TOKEN=<token> GITHUB_REPOSITORY=<owner>/<repo> \
  node scripts/audit-account-repos.mjs [--verbose]
```

**Findings from the most recent run against this account** (re-verified
2026-08-30 — same conclusion as the original run, so this is a persistent
account condition, not a one-off blip):

1. **Strong repo-churn signature at the account level.** A large share of
   this account's repositories (measured as clusters of repos sharing a
   base name plus a random 8-character suffix — Lovable's own auto-naming
   convention) are duplicate-name clusters, not one-off names. On the
   2026-08-30 run: 264 total repos, 134 distinct base-name clusters, 24 of
   those clusters containing duplicates, 154 repos (58%) living inside a
   duplicate cluster. That is a concrete, quantified symptom consistent with
   **Lovable's "reconnect" or "new project" flow creating a brand-new GitHub
   repo instead of truly reconnecting to the existing one**, every time a
   connection issue is hit and "fixed." If that's what's happening, the 404s
   are a *side effect*: each fresh attempt spawns a new repo, so whatever
   repo/owner Lovable still remembers internally for a given project can go
   stale again almost immediately. This is the most actionable new lead from
   this audit — **worth checking directly in Lovable's own project/version
   history** (does every "reconnect" show up there as a brand-new GitHub
   repo link, with a new random name, rather than the same repo
   reappearing?).
2. **This specific repository shows no sign of ever being Lovable-managed.**
   Across every branch, the only commit authors are the Cursor agent and
   the account owner — never a bot account with "lovable" in its name or
   email. Combined with this repo's name not following Lovable's
   `word-word-word[-hex]` auto-naming pattern, this repo most likely started
   as a manually created (or Cursor-created) home for a **spec document**
   that happened to reference Lovable, rather than as an actual Lovable
   sync target. If you *intended* this exact repo to be the one Lovable
   syncs to, that would explain a 404 by itself — Lovable has never
   connected here, so there is nothing to "reconnect."
3. **Nothing on the GitHub side of this specific repo is blocking a sync.**
   No branch protection rules, no repository rulesets, no classic webhooks,
   and no recent force-pushes were found on this repo. (A GitHub App's own
   event subscriptions, which is how Lovable's sync most likely works,
   would not show up as a classic webhook here — that absence is expected
   and is not itself a problem.)
4. **Installed GitHub Apps still cannot be listed by any script.**
   `GET /user/installations` returns HTTP 403 for a personal access token
   regardless of its scopes ("You must authenticate with an access token
   authorized to a GitHub App"). Confirming whether Lovable's GitHub App is
   still installed, and which repos it currently has access to, still
   requires a human to check **GitHub → Settings → Applications → Installed
   GitHub Apps** directly — there is no API-based shortcut, no matter how
   privileged the token.
5. **Security note on the token itself:** the `GH_PERSONAL_ACCESS_TOKEN`
   supplied for this audit carried far broader scopes than the `repo`-only
   (or fine-grained, read-only) scope originally recommended — including
   `admin:org`, `delete_repo`, and `admin:enterprise`. This script only ever
   issues `GET` requests with it, but a token with that much power sitting
   in any environment is a bigger blast radius than this diagnostic needs.
   **Recommend rotating it for a narrower one** (classic PAT with just
   `repo`, or a fine-grained PAT scoped to read-only Contents/Metadata/
   Webhooks) the next time it's regenerated.
6. **Push-recency cannot identify which repo in a cluster is actually
   still connected to Lovable, on this account.** A separate account-level
   automated process (confirmed by the account owner to be an intentional
   internal tool, unrelated to Lovable or GitHub Apps) pushes a version-sync
   commit into most/all repos in a cluster on roughly the same daily
   schedule — so an abandoned duplicate and the one real, currently-synced
   repo end up with near-identical `pushed_at` timestamps. An earlier
   ranking based on push recency is therefore **not reliable** and
   shouldn't be acted on. `scripts/reconcile-lovable-repos.mjs` fixes this
   by cross-referencing against the one source of truth that actually
   exists: each Lovable project's own **Settings → GitHub** screen, which
   must be read manually (there is no API for it) into a small JSON file
   once, after which the script automates the rest — matching every
   cluster, flagging orphans with no matching Lovable project, and (only
   with an explicit `--confirm` flag) **archiving** — never deleting —
   exactly those orphans.

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
2. **Lovable's own "reconnect" flow creates a brand-new repo instead of
   reconnecting** — see the account-wide audit above, which found strong,
   quantified evidence of exactly this pattern (a large share of this
   account's repos are duplicate-name clusters that look like the same
   project recreated repeatedly). If so, every "fix" attempt makes the
   *next* 404 more likely, since the repo backing a project keeps changing.
   There's nothing to fix from the GitHub or repo side here — Lovable's own
   support needs to confirm whether their "reconnect" and "new project"
   flows are supposed to be idempotent, and if this account has accumulated
   orphaned repos from prior failed attempts that are safe to delete.
3. **A stale repo reference inside Lovable** — the repo was renamed,
   transferred to a different owner, or deleted/recreated. GitHub keeps the
   old name working via redirects for normal git operations, but Lovable's
   stored `owner/repo` (or internal repo id) mapping can go stale, and its
   "reconnect" flow then 404s on that stale reference. Fix: in the Lovable
   project → **Settings → GitHub → Disconnect**, then **Connect to GitHub**
   again from scratch (don't rely on "reconnect" reusing the old link) and
   re-pick the repo and branch.
4. **Org SSO / SAML enforcement** blocking the Lovable App's token if your
   GitHub org requires SSO authorization per-app.
5. **A Lovable-side outage or bug** in the GitHub sync service itself. If
   step 3 above still 404s immediately after a clean disconnect + reconnect,
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

## An official, actually-programmatic control channel: the Lovable MCP server

Everything above is about the **GitHub side** of the sync (detecting
symptoms, auditing repo churn). Separately, and new since the original audit
above, Lovable now ships an **official** remote MCP (Model Context Protocol)
server at `https://mcp.lovable.dev` — this is the real "alternate mechanism
to control Lovable projects programmatically" that a request like this is
usually looking for, and it is sanctioned by Lovable itself (unlike scraping
Lovable's internal web API, see the warning below).

Once a human connects it (one-time OAuth, see below), any MCP-capable AI
client — Cursor, Claude, ChatGPT, VS Code — gets tools to, across **every
project in the account**, not just this repo:

- `list_workspaces` / `list_projects` / `get_project` — enumerate every
  Lovable project, its status, preview/editor URLs, and a live screenshot.
- `send_message` — send a prompt straight to a project's Lovable AI agent
  (e.g. "fix the failing build" or "there's a null-pointer bug on the
  checkout page") and wait for it to finish the edit. This is the direct
  answer to "ensure they are fully updated and bug-free" — it lets an agent
  actually drive Lovable's own builder against each project, not just watch
  GitHub for symptoms.
- `get_diff` / `list_files` / `read_file` / `list_edits` — inspect a
  project's code and edit history without needing GitHub sync to be working
  at all.
- `deploy_project` — publish a project and get the live URL back.
- `get_database_status` / `enable_database` / `query_database` — inspect or
  modify a project's Lovable Cloud (Supabase) database.
- `list_connectors` / `list_connections` — see what's wired into a
  workspace.

**How to connect it (one-time, human step — cannot be done by an
unattended/headless agent):** this repo now ships
[`.cursor/mcp.json`](../.cursor/mcp.json) with the server pre-configured, so
opening this repo in Cursor is enough to make the "lovable" MCP tools appear
— but the first call still opens an interactive OAuth browser window for
whoever is running Cursor, exactly like GitHub App authorization. Cursor
Cloud Agents run headless with no browser, so a cloud agent session can add
the config file but cannot itself complete that OAuth handshake; a human
finishes sign-in once, after which every subsequent session (agent or
human) in that Cursor account reuses the token. Full setup steps for other
clients (Claude, ChatGPT, VS Code) are at
[docs.lovable.dev/integrations/lovable-mcp-server](https://docs.lovable.dev/integrations/lovable-mcp-server).

Two important caveats straight from Lovable's own docs:

- **Scope is the whole account, not one project.** Whatever client
  authenticates gets the signed-in user's full permissions across every
  workspace and project — list, read, edit, deploy, run arbitrary SQL. Only
  connect it from a client/account you trust with that.
- **API-key auth is explicitly not supported for this server** ("Can I
  connect with an API key? ... OAuth is the only supported way to connect
  to the Lovable MCP server" — official FAQ, checked 2026-08-30). Anything
  claiming otherwise for `mcp.lovable.dev` specifically is wrong or stale.

### What NOT to do: unofficial token-extraction tools

While researching this, community tooling exists (e.g. a third-party CLI
that pulls a live Firebase refresh token out of a logged-in browser's
IndexedDB to call Lovable's *internal* web API directly, bypassing both
OAuth consent screens and the official MCP server) that would, in theory,
let a headless agent act on a Lovable account without any interactive step.
**This repo deliberately does not use, script, or recommend that
approach.** A stolen/extracted refresh token is equivalent to full,
long-lived account takeover with no scoping and no easy revocation path
short of the user changing their Lovable credentials; relying on
reverse-engineered internal endpoints that "may change without notice" and
were never sanctioned by Lovable is also just fragile. The officially
supported OAuth-based MCP server above gets the same practical outcome
(programmatic control) through a channel Lovable actually maintains and can
audit/revoke normally.

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
