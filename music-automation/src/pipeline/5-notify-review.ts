import { env } from '../config/env.js';
import { notifyViaSlack } from './notifiers/slack.js';
import { notifyViaEmail } from './notifiers/email.js';
import { notifyViaWhatsApp } from './notifiers/whatsapp.js';
import { logger } from '../lib/logger.js';

/**
 * Fans a review-gate notification out across every channel that's
 * configured (Slack, email, WhatsApp -- any, all, or none). Each channel
 * is independently a no-op when not configured, so this never throws for
 * an unconfigured channel; see notifiers/*.ts for per-channel behavior.
 *
 * The message includes the exact command to approve/reject via the repo's
 * workflow_dispatch action (.github/workflows/music-automation-approve.yml),
 * so the one human touchpoint this pipeline keeps by design (see README)
 * is a single click on a GitHub Actions "Run workflow" button, not a
 * server anyone has to keep running.
 */
export async function notifyForReview(
  songId: string,
  title: string,
  videoPath: string,
  repoSlug: string
): Promise<void> {
  const approveUrl = `${env.GITHUB_SERVER_URL}/${repoSlug}/actions/workflows/music-automation-approve.yml`;
  const runUrl = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${repoSlug}/actions/runs/${env.GITHUB_RUN_ID}`
    : null;

  const text =
    `New song ready for review: "${title}"\n` +
    (runUrl
      ? `Preview + download the rendered video/audio: ${runUrl} (see the "song-assets" artifact)\n`
      : `Local render: ${videoPath}\n`) +
    `Approve: ${approveUrl} -> "Run workflow" -> songId=${songId}, decision=approve\n` +
    `Reject: same workflow with decision=reject`;

  const results = await Promise.allSettled([
    notifyViaSlack(text),
    notifyViaEmail(`Song ready for review: ${title}`, text),
    notifyViaWhatsApp(text),
  ]);

  const anyConfigured = env.SLACK_WEBHOOK_URL || env.EMAIL_ENABLED || env.WHATSAPP_ENABLED;
  if (!anyConfigured) {
    logger.info('no review-notification channel configured (Slack/email/WhatsApp) -- skipping', { songId });
  }
  for (const result of results) {
    if (result.status === 'rejected') logger.warn('a notification channel threw', { error: String(result.reason) });
  }
}
