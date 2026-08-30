import { describe, expect, it, vi } from 'vitest';
import { notifyViaEmail, type MailTransport } from '../src/pipeline/notifiers/email.js';
import { notifyViaWhatsApp, type HttpClient as WhatsAppHttp } from '../src/pipeline/notifiers/whatsapp.js';
import { notifyViaSlack, type HttpClient as SlackHttp } from '../src/pipeline/notifiers/slack.js';

describe('notifyViaSlack', () => {
  it('is a no-op when no webhook URL is configured (the default)', async () => {
    const fakeHttp: SlackHttp = { fetch: vi.fn() as any };
    await notifyViaSlack('hello', fakeHttp, '');
    expect(fakeHttp.fetch).not.toHaveBeenCalled();
  });

  it('posts to the webhook when one is configured', async () => {
    const fakeHttp: SlackHttp = { fetch: vi.fn(async () => new Response('ok', { status: 200 })) as any };
    await notifyViaSlack('hello world', fakeHttp, 'https://hooks.slack.test/abc');
    expect(fakeHttp.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.test/abc',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('notifyViaEmail', () => {
  it('is a no-op when EMAIL_ENABLED is false (the default)', async () => {
    const fakeTransport: MailTransport = { sendMail: vi.fn() as any };
    await notifyViaEmail('subject', 'body', fakeTransport, false);
    expect(fakeTransport.sendMail).not.toHaveBeenCalled();
  });

  it('sends via the injected SMTP transport when enabled', async () => {
    const fakeTransport: MailTransport = { sendMail: vi.fn(async () => ({})) };
    await notifyViaEmail('Song ready', 'body text', fakeTransport, true);

    expect(fakeTransport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'me@example.com', from: 'bot@example.com', subject: 'Song ready' })
    );
  });
});

describe('notifyViaWhatsApp', () => {
  it('is a no-op when WHATSAPP_ENABLED is false (the default)', async () => {
    const fakeHttp: WhatsAppHttp = { fetch: vi.fn() as any };
    await notifyViaWhatsApp('hello', fakeHttp, false);
    expect(fakeHttp.fetch).not.toHaveBeenCalled();
  });

  it('posts a text message to the Meta Cloud API when enabled', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    const fakeHttp: WhatsAppHttp = {
      fetch: vi.fn(async (url, init) => {
        capturedUrl = url;
        capturedBody = JSON.parse(init.body as string);
        return new Response('{}', { status: 200 });
      }),
    };
    await notifyViaWhatsApp('song ready', fakeHttp, true);

    expect(capturedUrl).toBe('https://graph.facebook.com/v21.0/test-phone-number-id/messages');
    expect(capturedBody).toMatchObject({ to: '15551234567', type: 'text', text: { body: 'song ready' } });
  });
});
