#!/usr/bin/env node
// Read-only companion to scripts/audit-account-repos.mjs: for every
// duplicate-name cluster found on the account (base name + Lovable's
// random-hex auto-naming suffix), rank the repos in that cluster by
// last-push recency to produce a "which one is probably still current"
// candidate list.
//
// This script NEVER deletes, archives, or otherwise modifies any repo. It
// only reads and prints a JSON report. That's a deliberate boundary, not a
// missing feature: "most recently pushed" is a heuristic, and it can be
// wrong in exactly the case this is meant to help with -- a repo that a
// Lovable project is still (brokenly) pointing at may not have been pushed
// to in a long time, while an abandoned duplicate got pushed to more
// recently. Treat `probablyCurrent` as a starting point for a human to
// verify against each Lovable project's actual Settings -> GitHub screen,
// never as ground truth to act on unattended -- and especially never as
// justification for automated deletion, which is irreversible.
//
// If, after manual verification, you decide some duplicates are safe to
// retire, prefer archiving (`PATCH /repos/{owner}/{repo}` with
// `{"archived": true}`) over deleting: archiving is reversible, deletion
// is not. This script intentionally does not implement even that, so that
// taking action always requires a deliberate, separate step by a human who
// has reviewed the specific list first.
//
// Usage: node scripts/rank-duplicate-repos.mjs
// Env:   GH_PERSONAL_ACCESS_TOKEN (required)

const TOKEN = process.env.GH_PERSONAL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("GH_PERSONAL_ACCESS_TOKEN must be set.");
  process.exit(2);
}

async function githubApi(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "rank-duplicate-repos-script",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} returned HTTP ${res.status}`);
  return res.json();
}

async function listAllRepos() {
  const repos = [];
  for (let page = 1; page <= 20; page++) {
    const body = await githubApi(`/user/repos?per_page=100&page=${page}&sort=full_name`);
    if (!Array.isArray(body) || body.length === 0) break;
    repos.push(...body);
    if (body.length < 100) break;
  }
  return repos;
}

function baseName(name) {
  const m = name.match(/^(.*?)-?[0-9a-f]{8}$/i);
  if (m && name.length - m[1].length <= 9) return m[1] || name;
  return name;
}

async function main() {
  const repos = await listAllRepos();
  const clusters = new Map();
  for (const r of repos) {
    const key = baseName(r.name).toLowerCase();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(r);
  }

  const rankedClusters = [...clusters.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([base, list]) => {
      const ranked = [...list]
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .map((r, i) => ({
          fullName: r.full_name,
          pushedAt: r.pushed_at,
          createdAt: r.created_at,
          defaultBranch: r.default_branch,
          sizeKb: r.size,
          isEmpty: r.size === 0,
          visibility: r.visibility,
          probablyCurrent: i === 0,
        }));
      return { baseName: base, count: ranked.length, ranked };
    })
    .sort((a, b) => b.count - a.count);

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        clusterCount: rankedClusters.length,
        caveat:
          "probablyCurrent is a heuristic based on most-recent push only. " +
          "Verify against each Lovable project's Settings -> GitHub screen " +
          "before treating any repo as safe to retire, and prefer archiving " +
          "over deleting even after verification.",
        clusters: rankedClusters,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
