#!/usr/bin/env node
/**
 * One-time setup helper: obtains a YouTube refresh token so the pipeline
 * can publish videos with zero further human interaction afterwards.
 *
 * This is the one truly unavoidable manual step for YouTube -- every
 * platform requires *someone* to click "Allow" once per OAuth app, and no
 * amount of engineering removes that (it's the platform's own security
 * model, not a gap in this tool). After this runs once, YOUTUBE_REFRESH_TOKEN
 * keeps working indefinitely (until you revoke it).
 *
 * Usage:
 *   1. Create an OAuth 2.0 Client ID (type "Desktop app") in Google Cloud
 *      Console for a project with the YouTube Data API v3 enabled.
 *   2. YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npm run oauth:youtube
 *   3. A URL prints -- open it, sign in with the channel's Google account,
 *      approve, and this script prints the refresh token to save as
 *      YOUTUBE_REFRESH_TOKEN.
 */
import { createServer } from 'node:http';
import { google } from 'googleapis';

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.');
  process.exit(1);
}

const redirectUri = 'http://localhost:8933/oauth2callback';
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('\nOpen this URL, sign in as the channel that should publish, and approve access:\n');
console.log(authUrl, '\n');

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/oauth2callback')) return;
  const code = new URL(req.url, redirectUri).searchParams.get('code');
  res.end('You can close this tab and return to the terminal.');
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nSave this as YOUTUBE_REFRESH_TOKEN (a GitHub Actions secret, .env, etc):\n');
  console.log(tokens.refresh_token, '\n');
  process.exit(0);
});

server.listen(8933, () => console.log('Waiting for the OAuth redirect on http://localhost:8933 ...'));
