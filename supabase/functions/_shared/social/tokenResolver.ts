// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Resolves a connected social account's access token from server-side
// secrets. `social_accounts.credential_ref` stores the *name* of an Edge
// Function secret (e.g. "LINKEDIN_TOKEN_ACMECORP"), never the token itself,
// so the database never contains a usable credential on its own (spec §9,
// §49, §66).
//
// Populating these secrets happens through each platform's OAuth consent
// flow (a dedicated `social-oauth-callback` function per platform, run once
// per account) — wiring that up requires registering an app with each
// platform and is intentionally kept out of this generic adapter layer.
// -----------------------------------------------------------------------------

export function resolveAccessToken(credentialRef: string | null | undefined): string | null {
  if (!credentialRef) return null;
  return Deno.env.get(credentialRef) ?? null;
}
