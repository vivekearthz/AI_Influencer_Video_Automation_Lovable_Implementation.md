// deno-lint-ignore-file no-explicit-any
// Transactional email client (spec §17). Defaults to the Resend API but any
// provider can be swapped in by changing EMAIL_PROVIDER + this one file.

export function isEmailConfigured(): boolean {
  return Boolean(Deno.env.get("EMAIL_PROVIDER_KEY") && Deno.env.get("EMAIL_FROM_ADDRESS"));
}

export async function sendEmailCampaign(input: {
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const apiKey = Deno.env.get("EMAIL_PROVIDER_KEY");
  const from = Deno.env.get("EMAIL_FROM_ADDRESS");
  if (!apiKey || !from) {
    return { success: false, error: "Email provider is not configured (EMAIL_PROVIDER_KEY / EMAIL_FROM_ADDRESS)." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Email send failed (${res.status}): ${text}` };
    }

    const json = await res.json();
    return { success: true, externalId: json.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown email provider error" };
  }
}
