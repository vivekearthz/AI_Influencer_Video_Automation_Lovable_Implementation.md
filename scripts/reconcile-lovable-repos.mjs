#!/usr/bin/env node
// Cross-references this GitHub account's repos against the ONE piece of
// data that only exists inside Lovable's own UI: which repo each Lovable
// project is currently connected to (visible per-project under
// Settings -> GitHub). No API exists to fetch that mapping automatically
// (Lovable has no public API for it), so it has to be typed/pasted once by
// a human. Everything after that is fully automatic.
//
// This exists because push-recency cannot be used to tell a real,
// currently-connected repo apart from an abandoned duplicate on this
// account: a separate daily sync process ("guardian"/"master-sync", per
// the account owner) touches nearly every repo in every duplicate-name
// cluster on the same schedule, so almost all of them look equally fresh.
// See scripts/audit-account-repos.mjs and scripts/rank-duplicate-repos.mjs
// for that discovery.
//
// Usage:
//   1. For each Lovable project, open it -> Settings -> GitHub, and note
//      the exact connected repo (owner/repo). Put these in a JSON file:
//        [
//          { "project": "Pahlastep", "repo": "vivekearthz/pahlastep-487735dc" },
//          { "project": "Kimisearch", "repo": "vivekearthz/kimisearch" }
//        ]
//   2. node scripts/reconcile-lovable-repos.mjs connected-repos.json
//        -> prints, per duplicate cluster, which repo(s) are confirmed
//           connected (KEEP) and which have no matching Lovable project
//           (ORPHAN candidate).
//   3. Review the ORPHAN list yourself. If you're confident, re-run with
//      --archive-orphans --confirm to archive (never delete) exactly the
//      repos listed as orphans in step 2's output. Archiving is
//      reversible (unarchive any time from the repo's Settings); deletion
//      is not, which is why this script never deletes anything.
//
// Env: GH_PERSONAL_ACCESS_TOKEN (required; needs `repo` scope, and
//      `public_repo`/`repo` admin rights on repos you want to archive)

import { readFileSync } from "node:fs";

const TOKEN = process.env.GH_PERSONAL_ACCESS_TOKEN;
const [, , inputPath, ...flags] = process.argv;
const APPLY = flags.includes("--archive-orphans");
const CONFIRMED = flags.includes("--confirm");

if (!TOKEN) {
  console.error("GH_PERSONAL_ACCESS_TOKEN must be set.");
  process.exit(2);
}
if (!inputPath) {
  console.error(
    "Usage: node scripts/reconcile-lovable-repos.mjs <connected-repos.json> [--archive-orphans --confirm]\n" +
      "See the script header for the expected JSON shape."
  );
  process.exit(2);
}

let connected;
try {
  connected = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (err) {
  console.error(`Could not read/parse ${inputPath}: ${err.message}`);
  process.exit(2);
}
if (!Array.isArray(connected)) {
  console.error('Input must be a JSON array of { "project": ..., "repo": "owner/name" }.');
  process.exit(2);
}

const connectedRepoSet = new Set(
  connected.map((c) => c.repo.toLowerCase().replace(/^https?:\/\/github\.com\//i, ""))
);

async function githubApi(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "reconcile-lovable-repos-script",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} returned HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
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

  const orphansToArchive = [];
  const report = [];

  for (const [base, list] of clusters) {
    if (list.length < 2) continue;
    const keep = list.filter((r) => connectedRepoSet.has(r.full_name.toLowerCase()));
    const orphans = list.filter((r) => !connectedRepoSet.has(r.full_name.toLowerCase()));
    if (keep.length === 0 && orphans.length === list.length) {
      // No repo in this cluster matches any known Lovable connection --
      // could mean the project was never in the input file, not
      // necessarily that all of them are safe to archive. Flag, don't act.
      report.push({
        baseName: base,
        status: "NO_MATCH_FOUND -- verify manually, none of these matched your input file",
        repos: list.map((r) => r.full_name),
      });
      continue;
    }
    report.push({
      baseName: base,
      keep: keep.map((r) => r.full_name),
      orphanCandidates: orphans.map((r) => r.full_name),
    });
    orphansToArchive.push(...orphans.map((r) => r.full_name));
  }

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        connectedReposProvided: connected.length,
        clustersReconciled: report.length,
        report,
      },
      null,
      2
    )
  );

  if (APPLY) {
    if (!CONFIRMED) {
      console.error(
        "\n--archive-orphans requires --confirm as well. Nothing was archived. " +
          "Review the report above first."
      );
      process.exit(1);
    }
    console.error(`\nArchiving ${orphansToArchive.length} orphan repo(s)...`);
    for (const fullName of orphansToArchive) {
      const [owner, repo] = fullName.split("/");
      try {
        await githubApi(`/repos/${owner}/${repo}`, {
          method: "PATCH",
          body: JSON.stringify({ archived: true }),
        });
        console.error(`archived: ${fullName}`);
      } catch (err) {
        console.error(`FAILED to archive ${fullName}: ${err.message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
