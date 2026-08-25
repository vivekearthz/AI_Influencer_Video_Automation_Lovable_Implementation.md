// deno-lint-ignore-file no-explicit-any
// WhatsApp Business Cloud API client (spec §16). Official API only — no
// WhatsApp Web session/password automation.

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(Deno.env.get("WHATSAPP_ACCESS_TOKEN") && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"));
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  language: string;
  mediaUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp Cloud API is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  }

  const components = input.mediaUrl
    ? [{ type: "header", parameters: [{ type: "video", video: { link: input.mediaUrl } }] }]
    : [];

  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.language },
          components,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `WhatsApp send failed (${res.status}): ${text}` };
    }

    const json = await res.json();
    return { success: true, messageId: json.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown WhatsApp error" };
  }
}
