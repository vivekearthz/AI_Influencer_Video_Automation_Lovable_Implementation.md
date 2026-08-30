import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface MailTransport {
  sendMail(options: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

/**
 * Free email notifications over plain SMTP -- works with any provider
 * that gives you free SMTP credentials, no vendor lock-in:
 *  - Gmail (a personal account, free): smtp.gmail.com:587, using a
 *    Google-Account "App Password" as SMTP_PASS (not your real password).
 *  - Zoho Mail Free: smtp.zoho.com:587
 *  - Brevo (free 300 emails/day): smtp-relay.brevo.com:587
 *  - Resend (free 3,000 emails/month): smtp.resend.com:465
 * See README for exact per-provider setup steps.
 */
export async function notifyViaEmail(
  subject: string,
  text: string,
  transport?: MailTransport,
  enabled: boolean = env.EMAIL_ENABLED
): Promise<void> {
  if (!enabled) return;

  const mailer =
    transport ??
    nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

  try {
    await mailer.sendMail({ from: env.EMAIL_FROM || env.SMTP_USER, to: env.EMAIL_TO, subject, text });
  } catch (err) {
    logger.warn('email notification failed', { error: String(err) });
  }
}
