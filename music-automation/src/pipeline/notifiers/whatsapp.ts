import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface HttpClient {
  fetch(url: string, init: RequestInit): Promise<Response>;
}

const defaultHttpClient: HttpClient = { fetch: (url, init) => fetch(url, init) };

/**
 * WhatsApp via Meta's official Cloud API (graph.facebook.com). Sends a
 * plain "text" message, which Meta only allows for free within an open
 * 24-hour customer-service window (i.e. `WHATSAPP_TO_NUMBER` messaged your
 * WhatsApp Business number at some point in the last 24h). Outside that
 * window Meta will reject a plain text send with an error -- the honest
 * fix, since there is no way to make an unprompted notification free, is
 * either (a) message the bot once a day yourself to keep the window open
 * (free), or (b) accept Meta's per-message "utility" template rate, a
 * fraction of a cent per message in most markets (see README). This
 * function does not fall back to a paid template automatically -- that's
 * a deliberate choice so nothing here spends money without you opting in.
 */
export async function notifyViaWhatsApp(
  text: string,
  http: HttpClient = defaultHttpClient,
  enabled: boolean = env.WHATSAPP_ENABLED
): Promise<void> {
  if (!enabled) return;

  const res = await http.fetch(
    `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: env.WHATSAPP_TO_NUMBER,
        type: 'text',
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('whatsapp notification failed (likely no open 24h service window -- see notifiers/whatsapp.ts)', {
      status: res.status,
      body,
    });
  }
}
