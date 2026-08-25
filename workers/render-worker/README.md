# Render worker

FFmpeg brand-overlay + subtitle-burn worker for AI Video Studio (spec §25-27).

Supabase Edge Functions run on Deno and cannot shell out to the `ffmpeg`
binary, so video assembly is deliberately split out into this small
always-on (or scheduled) Node process. It polls `ai_generation_jobs` for
`job_type = 'render'` rows that the `video-render` Edge Function queued,
concatenates the generated scene clips, overlays the brand logo/CTA/website,
burns subtitles, and uploads the final MP4 back to the `rendered-video`
Supabase Storage bucket.

## Running locally

```bash
cd workers/render-worker
npm install
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run start
```

Requires `ffmpeg` to be installed and on `PATH` (`brew install ffmpeg` /
`apt-get install ffmpeg`).

## Deploying

Build and run the Docker image (already includes `ffmpeg`):

```bash
docker build -t render-worker .
docker run --env-file .env render-worker
```

Deploy the resulting image to any always-on container host (Fly.io,
Railway, Render.com, ECS, a small VM, etc.) — anywhere that can run a
long-lived process and reach your Supabase project. Only two secrets are
required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never expose this to a browser)

Optional:

- `RENDER_WORKER_POLL_INTERVAL_MS` (default `5000`)

## Notes

- Subtitles are generated with naive even-timing across sentences when no
  word-level timestamps are available (see `src/subtitles.ts`). Swap in a
  real ASR/forced-alignment step for production-grade sync.
- The worker always re-encodes to H.264/AAC with `-movflags +faststart` so
  the result is broadly compatible with social platform upload APIs.
