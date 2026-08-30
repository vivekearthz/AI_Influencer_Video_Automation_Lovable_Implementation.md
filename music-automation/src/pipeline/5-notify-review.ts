import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * Posts a review-gate notification to Slack. This stage is a no-op (and
 * does not throw) when SLACK_WEBHOOK_URL is unset, so the pipeline still
 * runs end-to-end without Slack configured -- see AUTO_APPROVE in
 * README "Zero-human-intervention mode" for skipping the gate entirely.
 *
 * The message includes the exact command to approve/reject via the repo's
 * workflow_dispatch actions (.github/workflows/music-automation-approve.yml),
 * so the one human touchpoint this pipeline keeps by design (see README)
 * is a single click on a GitHub Actions "Run workflow" button, not a
 * server anyone has to keep running.
 */
export async function notifyForReview(
  songId: string,
  title: string,
  videoPath: string,
  repoSlug: string,
  http: HttpClient = defaultHttpClient
): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) {
    logger.info('SLACK_WEBHOOK_URL not set -- skipping review notification', { songId });
    return;
  }

  const approveUrl = `${env.GITHUB_SERVER_URL}/${repoSlug}/actions/workflows/music-automation-approve.yml`;
  const runUrl = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${repoSlug}/actions/runs/${env.GITHUB_RUN_ID}`
    : null;

  const text =
    `New song ready for review: *${title}*\n` +
    (runUrl
      ? `Preview + download the rendered video/audio: ${runUrl} (see the "song-assets" artifact)\n`
      : `Local render: ${videoPath}\n`) +
    `Approve: ${approveUrl} -> "Run workflow" -> songId=${songId}, decision=approve\n` +
    `Reject: same workflow with decision=reject`;

  const res = await http.fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('slack notification failed', { status: res.status, body });
  }
}
