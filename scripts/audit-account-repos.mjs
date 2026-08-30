#!/usr/bin/env node
// Manual, on-demand account-wide diagnostic for the "Lovable GitHub 404 on
// reconnect" failure class documented in docs/integration-connections.md.
//
// This is intentionally NOT wired into the scheduled GitHub Actions workflow
// (.github/workflows/sync-health-selfheal.yml). That workflow only ever
// needs the low-privilege, repo-scoped GITHUB_TOKEN that Actions injects
// automatically. This script instead needs read access to *account-level*
// data (every repo the account owns, and admin-only per-repo settings like
// webhooks/rulesets) that a repo-scoped token cannot see, which means it
// needs a broader personal access token. Putting a token with that much
// power into a public repository's CI secrets would be a real security
// risk, so this stays a script you run by hand (e.g. from a Cursor cloud
// agent session where the token is injected only as a VM environment
// variable via Cursor Dashboard -> Cloud Agents -> Secrets, never committed
// or logged).
//
// What this can detect:
//   - "repo churn": clusters of repos sharing a base name with a random
//     suffix (Lovable's own auto-naming convention). A high fraction of an
//     account's repos falling into such clusters is a concrete, quantified
//     symptom consistent with Lovable's "reconnect" flow creating a brand
//     new repo instead of truly reconnecting to an existing one -- which
//     would explain recurring 404s (the project's *current* repo keeps
//     changing out from under it).
//   - for one target repo (via GITHUB_REPOSITORY, same convention as
//     scripts/check-sync-health.mjs): whether it has any branch protection
//     rules, repository rulesets, classic webhooks, or recent force-pushes
//     that could interfere with Lovable's sync, and who has actually
//     committed to it (to spot whether a Lovable bot has ever pushed here
//     at all, vs. only humans/other tools).
//
// What this cannot detect: which GitHub Apps are installed on the account
// and which repos they can access. That is only exposed by GitHub's own
// Settings UI (Settings -> Applications -> Installed GitHub Apps) or by a
// GitHub App's own user-to-server OAuth token -- a classic personal access
// token gets an explicit 403 from GET /user/installations no matter how
// broad its scopes are. There is no API workaround for this from a PAT.
//
// Usage: node scripts/audit-account-repos.mjs [--verbose]
// Env:
//   GH_PERSONAL_ACCESS_TOKEN   classic or fine-grained PAT for the account
//                              being audited (required)
//   GITHUB_REPOSITORY          "owner/repo" of the target repo for the
//                              per-repo checks (optional; skipped if unset)
//
// Prints a JSON report to stdout. Never prints the token. By default omits
// individual repo names from the summary (only counts/percentages) since
// this account may have many private repos whose names you may not want in
// a terminal that gets logged/shared; pass --verbose to also list the
// duplicate-name clusters by name for your own investigation.

const TOKEN = process.env.GH_PERSONAL_ACCESS_TOKEN;
const VERBOSE = process.argv.includes("--verbose");

if (!TOKEN) {
  console.error(
    "GH_PERSONAL_ACCESS_TOKEN must be set. This is intentionally a manual " +
      "run, not a CI secret -- see the script header for why."
  );
  process.exit(2);
}

async function githubApi(path, { allow404 = false } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "audit-account-repos-script",
    },
  });
  if (allow404 && res.status === 404) return { status: 404, body: null };
  if (!res.ok) {
    throw new Error(`GitHub API ${path} returned HTTP ${res.status}`);
  }
  return { status: res.status, body: await res.json() };
}

async function listAllRepos() {
  const repos = [];
  for (let page = 1; page <= 20; page++) {
    const { body } = await githubApi(
      `/user/repos?per_page=100&page=${page}&sort=full_name`
    );
    if (!Array.isArray(body) || body.length === 0) break;
    repos.push(...body);
    if (body.length < 100) break;
  }
  return repos;
}

// Lovable's auto-generated repo names look like "base-name-<8 hex chars>"
// or "basename<8 hex chars>" (no separator). This groups repos by their
// name with any such trailing suffix stripped, so that N repos which are
// really "the same Lovable project, recreated N times" collapse into one
// cluster.
function baseName(name) {
  const m = name.match(/^(.*?)-?[0-9a-f]{8}$/i);
  if (m && name.length - m[1].length <= 9) return m[1] || name;
  return name;
}

function clusterRepos(repos) {
  const clusters = new Map();
  for (const r of repos) {
    const key = baseName(r.name).toLowerCase();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(r);
  }
  return clusters;
}

async function checkTargetRepo(repoFullName) {
  const [owner, repo] = repoFullName.split("/");
  const result = { repo: repoFullName };

  const protection = await githubApi(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(
      repoFullNameDefaultBranch
    )}/protection`,
    { allow404: true }
  ).catch((err) => ({ error: err.message }));
  result.defaultBranchProtected = protection.status === 200;

  const rulesets = await githubApi(`/repos/${owner}/${repo}/rulesets`).catch(
    (err) => ({ body: [], error: err.message })
  );
  result.rulesetCount = Array.isArray(rulesets.body) ? rulesets.body.length : null;

  const hooks = await githubApi(`/repos/${owner}/${repo}/hooks`).catch(
    (err) => ({ body: [], error: err.message })
  );
  result.classicWebhookCount = Array.isArray(hooks.body) ? hooks.body.length : null;
  result.note =
    "classicWebhookCount only sees repo-level webhooks, not GitHub App event " +
    "subscriptions (Lovable's App-based sync, if any, would not show up here " +
    "-- that's expected and not itself a problem).";

  const events = await githubApi(`/repos/${owner}/${repo}/events?per_page=100`).catch(
    (err) => ({ body: [], error: err.message })
  );
  const pushEvents = Array.isArray(events.body)
    ? events.body.filter((e) => e.type === "PushEvent")
    : [];
  result.recentForcePushes = pushEvents.filter((e) => e.payload?.forced).length;
  result.recentPushEventsSeen = pushEvents.length;

  const authors = new Set();
  for (const branch of ["main", ...(await listOtherBranches(owner, repo))]) {
    try {
      const { body } = await githubApi(
        `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(
          branch
        )}&per_page=100`,
        { allow404: true }
      );
      for (const c of body || []) {
        authors.add(`${c.commit.author.name} <${c.commit.author.email}>`);
      }
    } catch {
      // best-effort; skip branches that error
    }
  }
  result.distinctCommitAuthors = [...authors];
  result.hasLikelyLovableBotCommit = [...authors].some((a) =>
    /lovable/i.test(a)
  );

  return result;
}

let repoFullNameDefaultBranch = "main";

async function listOtherBranches(owner, repo) {
  try {
    const { body } = await githubApi(
      `/repos/${owner}/${repo}/branches?per_page=100`
    );
    return (body || []).map((b) => b.name).filter((n) => n !== "main");
  } catch {
    return [];
  }
}

async function main() {
  const repos = await listAllRepos();
  const clusters = clusterRepos(repos);
  const dupeClusters = [...clusters.entries()].filter(([, v]) => v.length > 1);
  const dupeRepoCount = dupeClusters.reduce((sum, [, v]) => sum + v.length, 0);

  const report = {
    checkedAt: new Date().toISOString(),
    account: {
      totalRepos: repos.length,
      distinctBaseNameClusters: clusters.size,
      clustersWithDuplicates: dupeClusters.length,
      reposInDuplicateClusters: dupeRepoCount,
      duplicateClusterPercentOfRepos:
        repos.length > 0
          ? Math.round((dupeRepoCount / repos.length) * 100)
          : 0,
      interpretation:
        dupeRepoCount / Math.max(repos.length, 1) > 0.2
          ? "A large fraction of this account's repos are duplicate-name " +
            "clusters (base name + random suffix). This is consistent with " +
            "Lovable's own auto-naming convention and is a concrete symptom " +
            "of repos being repeatedly recreated rather than the same repo " +
            "being reconnected -- a strong candidate root cause for " +
            "recurring 404-on-reconnect reports. Verify in Lovable's project " +
            "history whether each 'fix the connection' attempt corresponds " +
            "to a freshly created repo in this list."
          : "No strong repo-churn signature found at the account level.",
    },
    duplicateClusterSample: VERBOSE
      ? dupeClusters
          .sort((a, b) => b[1].length - a[1].length)
          .map(([base, list]) => ({
            baseName: base,
            count: list.length,
            repos: list.map((r) => r.full_name),
          }))
      : "run with --verbose to list cluster names/repos",
  };

  if (process.env.GITHUB_REPOSITORY) {
    try {
      const target = await githubApi(
        `/repos/${process.env.GITHUB_REPOSITORY}`
      );
      repoFullNameDefaultBranch = target.body.default_branch || "main";
      report.targetRepo = await checkTargetRepo(process.env.GITHUB_REPOSITORY);
    } catch (err) {
      report.targetRepo = { error: err.message };
    }
  }

  try {
    await githubApi("/user/installations");
    report.appInstallationsListable = true;
  } catch {
    report.appInstallationsListable = false;
    report.appInstallationsNote =
      "GET /user/installations is not usable from a classic/fine-grained " +
      "PAT regardless of scopes (confirmed: 403 'You must authenticate with " +
      "an access token authorized to a GitHub App'). Checking which GitHub " +
      "Apps (e.g. Lovable) are installed and which repos they can access " +
      "must be done manually in GitHub -> Settings -> Applications -> " +
      "Installed GitHub Apps. No PAT-based script can automate this check.";
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("Unexpected error running account audit:", err);
  process.exit(2);
});
