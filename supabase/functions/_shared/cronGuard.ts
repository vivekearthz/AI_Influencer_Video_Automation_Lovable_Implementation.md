// -----------------------------------------------------------------------------
// Authentication guard for the campaign orchestrator (spec §35 "orchestrator
// should enqueue dependent jobs only after prerequisites complete"). This
// function is meant to be called on a schedule (pg_cron, GitHub Actions, or
// any external cron pinger) rather than by end users, so it is deployed with
// `verify_jwt = false` (see supabase/config.toml) and instead requires a
// shared secret header — never rely on the anon key alone as "auth" since
// it is public in the frontend bundle.
// -----------------------------------------------------------------------------

export function isAuthorizedCronRequest(req: Request): boolean {
  const expected = Deno.env.get("ORCHESTRATOR_CRON_SECRET");
  if (!expected) {
    // Fail closed: if no secret is configured, refuse to run rather than
    // silently allowing anyone with the function URL to trigger AI spend.
    return false;
  }
  const provided = req.headers.get("X-Cron-Secret") ?? req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(provided) && provided === expected;
}
