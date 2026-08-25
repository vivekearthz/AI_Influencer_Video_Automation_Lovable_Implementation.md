// deno-lint-ignore-file no-explicit-any
// ElevenLabs TTS client (spec §3.3 Mode B, §43).

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

function requireApiKey(): string {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured for this project.");
  return key;
}

export async function synthesizeSpeech(input: {
  voiceId: string;
  text: string;
  modelId?: string;
}): Promise<Uint8Array> {
  const apiKey = requireApiKey();
  const res = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${input.voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: input.text,
      model_id: input.modelId ?? "eleven_multilingual_v2",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${text}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

export async function listVoices(): Promise<any[]> {
  const apiKey = requireApiKey();
  const res = await fetch(`${ELEVENLABS_BASE_URL}/voices`, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw new Error(`ElevenLabs list voices failed (${res.status})`);
  const json = await res.json();
  return json.voices ?? [];
}
