#!/usr/bin/env node
// Self-healing-friendly health check for the GitHub <-> Lovable sync setup
// documented in docs/integration-connections.md.
//
// What this can actually detect (things visible from the GitHub side):
//   - a branch that a Lovable project is supposed to sync to disappearing
//     or being force-pushed away from its expected app
//   - the files a given app needs at the root of its sync branch going
//     missing (a strong signal that the wrong branch/repo got connected,
//     or that a merge blew away the app)
//   - optionally, that a linked Supabase project's REST endpoint is
//     reachable, if a SUPABASE_HEALTHCHECK_URL_* secret is configured
//
// What this cannot detect or fix: the Lovable-side GitHub App
// authorization itself. That state lives entirely in GitHub's and
// Lovable's account systems, not in this repository, and reconnecting it
// always requires a human to complete an OAuth/GitHub App consent step.
// See docs/integration-connections.md for the manual recovery runbook.
//
// Usage: node scripts/check-sync-health.mjs
// Env:
//   GITHUB_TOKEN        GitHub token with read access to this repo (required)
//   GITHUB_REPOSITORY   "owner/repo" (required; set automatically in Actions)
//   SUPABASE_HEALTHCHECK_URL_<NAME>  optional, one per app to reachability-check
//
// Exit code 0 = healthy (or all checks skipped), 1 = one or more hard
// failures found. Prints a JSON report to stdout either way.

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;

if (!REPO || !TOKEN) {
  console.error(
    "GITHUB_REPOSITORY and GITHUB_TOKEN must be set (see script header)."
  );
  process.exit(2);
}

const [OWNER, REPO_NAME] = REPO.split("/");

// Keep this in sync with the table in docs/integration-connections.md.
const APPS = [
  {
    name: "AI Video Studio",
    branch: "main",
    requiredFiles: ["package.json", "supabase/config.toml", "src/App.tsx"],
  },
  {
    name: "InfluenceOS",
    branch: "cursor/influenceos-marketplace-root-d753",
    requiredFiles: [
      "package.json",
      "supabase/config.toml",
      "src/App.tsx",
    ],
  },
];

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        console.error(
          `[retry] ${label} failed (attempt ${attempt}/${RETRY_ATTEMPTS}): ${err.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

async function githubApi(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sync-health-selfheal-script",
    },
  });
  if (res.status === 404) {
    return { status: 404, body: null };
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${path} returned HTTP ${res.status}`);
  }
  return { status: res.status, body: await res.json() };
}

async function branchExists(branch) {
  const { status } = await githubApi(
    `/repos/${OWNER}/${REPO_NAME}/branches/${encodeURIComponent(branch)}`
  );
  return status !== 404;
}

async function fileExistsAtBranch(branch, filePath) {
  const { status } = await githubApi(
    `/repos/${OWNER}/${REPO_NAME}/contents/${filePath}?ref=${encodeURIComponent(
      branch
    )}`
  );
  return status !== 404;
}

async function checkApp(app) {
  const result = {
    app: app.name,
    branch: app.branch,
    branchExists: false,
    missingFiles: [],
    ok: false,
  };

  try {
    result.branchExists = await withRetry(
      `branch check (${app.branch})`,
      () => branchExists(app.branch)
    );
  } catch (err) {
    result.error = `Could not verify branch after retries: ${err.message}`;
    return result;
  }

  if (!result.branchExists) {
    result.error = `Branch "${app.branch}" is missing on origin. Lovable syncs to this exact branch name — if it was renamed or deleted, Lovable's connection will 404 until either the branch is restored or the Lovable project is repointed at the new branch name.`;
    return result;
  }

  for (const file of app.requiredFiles) {
    try {
      const exists = await withRetry(
        `file check (${app.branch}:${file})`,
        () => fileExistsAtBranch(app.branch, file)
      );
      if (!exists) result.missingFiles.push(file);
    } catch (err) {
      result.error = `Could not verify "${file}" after retries: ${err.message}`;
      return result;
    }
  }

  result.ok = result.branchExists && result.missingFiles.length === 0;
  if (!result.ok && !result.error) {
    result.error = `Missing expected file(s) at the root of "${app.branch}": ${result.missingFiles.join(
      ", "
    )}. This usually means the wrong branch/repo is connected, or a merge overwrote this app.`;
  }
  return result;
}

async function checkSupabaseEndpoints() {
  const checks = [];
  for (const [key, url] of Object.entries(process.env)) {
    if (!key.startsWith("SUPABASE_HEALTHCHECK_URL_") || !url) continue;
    const name = key.replace("SUPABASE_HEALTHCHECK_URL_", "");
    const check = { name, url, ok: false };
    try {
      await withRetry(`supabase reachability (${name})`, async () => {
        const res = await fetch(url, { method: "GET" });
        // Any HTTP response (even 401/404 from Supabase itself) means the
        // project is reachable; only network-level failures should retry/fail.
        check.httpStatus = res.status;
      });
      check.ok = true;
    } catch (err) {
      check.error = `Unreachable after retries: ${err.message}`;
    }
    checks.push(check);
  }
  return checks;
}

async function main() {
  const appResults = [];
  for (const app of APPS) {
    appResults.push(await checkApp(app));
  }
  const supabaseResults = await checkSupabaseEndpoints();

  const hardFailures = [
    ...appResults.filter((r) => !r.ok),
    ...supabaseResults.filter((r) => !r.ok),
  ];

  const report = {
    checkedAt: new Date().toISOString(),
    repo: REPO,
    apps: appResults,
    supabase:
      supabaseResults.length > 0
        ? supabaseResults
        : "no SUPABASE_HEALTHCHECK_URL_* secrets configured; skipped",
    healthy: hardFailures.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.healthy ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error running health check:", err);
  process.exit(2);
});
