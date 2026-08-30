import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/** No-op (does not throw) when SLACK_WEBHOOK_URL is unset. */
export async function notifyViaSlack(
  text: string,
  http: HttpClient = defaultHttpClient,
  webhookUrl: string = env.SLACK_WEBHOOK_URL
): Promise<void> {
  if (!webhookUrl) return;

  const res = await http.fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('slack notification failed', { status: res.status, body });
  }
}
