#!/usr/bin/env node
/**
 * One-time setup helper: exchanges a SoundCloud authorization code (OAuth
 * 2.1 + PKCE) for an access/refresh token pair.
 *
 * Requires an active SoundCloud Artist Pro subscription to generate a
 * Client ID/Secret in the first place (self-service portal at
 * https://developers.soundcloud.com as of 2026) -- see README for why this
 * is the one paid ingredient SoundCloud publishing needs.
 *
 * Usage:
 *   SOUNDCLOUD_CLIENT_ID=... SOUNDCLOUD_CLIENT_SECRET=... npm run oauth:soundcloud
 */
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET first.');
  process.exit(1);
}

const redirectUri = 'http://localhost:8934/callback';
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

const authUrl = new URL('https://secure.soundcloud.com/authorize');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\nOpen this URL, sign in with the SoundCloud (Artist Pro) account, and approve access:\n');
console.log(authUrl.toString(), '\n');

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) return;
  const code = new URL(req.url, redirectUri).searchParams.get('code');
  res.end('You can close this tab and return to the terminal.');
  server.close();

  const tokenRes = await fetch('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      code,
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error('\nToken exchange failed:', tokens);
    process.exit(1);
  }

  console.log('\nSave these (access token is short-lived, ~1hr; the pipeline should refresh with the refresh token):\n');
  console.log('SOUNDCLOUD_ACCESS_TOKEN=', tokens.access_token);
  console.log('SOUNDCLOUD_REFRESH_TOKEN=', tokens.refresh_token, '\n');
  process.exit(0);
});

server.listen(8934, () => console.log('Waiting for the OAuth redirect on http://localhost:8934 ...'));
