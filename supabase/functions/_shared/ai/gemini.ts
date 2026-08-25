// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Gemini text client (spec §3.1, §18, §37, §44). Endpoint/response shapes
// follow the public Generative Language API (https://ai.google.dev/api).
// Google revises model names and preview endpoints regularly — the model key
// itself always comes from `ai_models.model_key` (never hard-coded here) so
// an admin can swap it from the Providers page without a redeploy.
// -----------------------------------------------------------------------------

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function requireApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured for this project.");
  return key;
}

export interface GenerateTextInput {
  modelKey: string;
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: "text/plain" | "application/json";
  temperature?: number;
}

export async function generateText(input: GenerateTextInput): Promise<string> {
  const apiKey = requireApiKey();
  const url = `${GEMINI_BASE_URL}/models/${input.modelKey}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: {
      temperature: input.temperature ?? 0.6,
      responseMimeType: input.responseMimeType ?? "text/plain",
    },
  };
  if (input.systemInstruction) {
    body.systemInstruction = { role: "system", parts: [{ text: input.systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function generateJson<T>(input: GenerateTextInput): Promise<T> {
  const raw = await generateText({ ...input, responseMimeType: "application/json" });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap JSON in markdown fences despite the mime type hint.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Gemini did not return valid JSON");
  }
}

export interface GenerateImageInput {
  modelKey: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

/**
 * Imagen-family image generation via the `:predict` endpoint. Returns raw
 * base64-encoded image bytes for the caller to upload to Supabase Storage.
 */
export async function generateImage(input: GenerateImageInput): Promise<Uint8Array> {
  const apiKey = requireApiKey();
  const url = `${GEMINI_BASE_URL}/models/${input.modelKey}:predict?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: input.prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: input.aspectRatio ?? "9:16",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini image generation failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const base64 = json?.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) throw new Error("Gemini image generation returned no image data");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface ScriptScene {
  scene: number;
  duration: number;
  visual: string;
  dialogue: string;
  camera?: string;
  expression?: string;
}

export interface GeneratedScript {
  hook: string;
  scenes: ScriptScene[];
  spoken_script: string;
  onscreen_text: string[];
  cta: string;
}

export async function generateCampaignScript(input: {
  modelKey: string;
  productName: string;
  productDescription?: string;
  targetAudience: string;
  language: string;
  durationSeconds: number;
  style?: string;
  cta?: string;
  tone?: string;
}): Promise<GeneratedScript> {
  const prompt = `You are a senior advertising scriptwriter creating a ${input.durationSeconds}-second vertical
video script in ${input.language}.

Product/service: ${input.productName}
${input.productDescription ? `Description: ${input.productDescription}` : ""}
Target audience: ${input.targetAudience}
Style: ${input.style ?? "premium UGC"}
Tone: ${input.tone ?? "professional, conversational"}
${input.cta ? `Required call to action: ${input.cta}` : ""}

Requirements:
- Natural, spoken, conversational language — not corporate jargon.
- No exaggerated claims, no unsupported financial/medical/legal guarantees.
- Strong hook in the first 2 seconds.
- One clear call to action.
- Break the script into 8-second scenes suitable for AI video generation.
- Return ONLY strict JSON matching this shape:
{
  "hook": string,
  "scenes": [{ "scene": number, "duration": number, "visual": string, "dialogue": string, "camera": string, "expression": string }],
  "spoken_script": string,
  "onscreen_text": string[],
  "cta": string
}`;

  return generateJson<GeneratedScript>({ modelKey: input.modelKey, prompt, temperature: 0.7 });
}

export interface CaptionSet {
  linkedin?: { caption: string; hashtags: string[] };
  instagram?: { caption: string; hashtags: string[] };
  facebook?: { caption: string; hashtags: string[] };
  youtube?: { title: string; description: string; tags: string[] };
  tiktok?: { caption: string; hashtags: string[] };
  x?: { caption: string; hashtags: string[] };
  pinterest?: { description: string };
  threads?: { caption: string };
  [platform: string]: unknown;
}

export async function generatePlatformCaptions(input: {
  modelKey: string;
  spokenScript: string;
  hook: string;
  cta: string;
  platforms: string[];
  language: string;
}): Promise<CaptionSet> {
  const prompt = `Given this video ad script, write platform-specific captions (NOT identical copy on every
platform) for: ${input.platforms.join(", ")}.

Hook: ${input.hook}
Script: ${input.spokenScript}
CTA: ${input.cta}
Language: ${input.language}

Return ONLY strict JSON. Use short punchy captions for short-form video platforms (instagram, tiktok, x, threads),
a professional tone for linkedin, and full title/description/tags for youtube. Include relevant hashtags where the
platform supports them.`;

  return generateJson<CaptionSet>({ modelKey: input.modelKey, prompt, temperature: 0.8 });
}

export interface QCResult {
  approved: boolean;
  score: number;
  issues: string[];
  requires_human_review: boolean;
  flagged_categories: string[];
}

export async function runQualityControl(input: {
  modelKey: string;
  script: GeneratedScript;
  cta?: string;
  landingUrl?: string;
  brandPhone?: string;
}): Promise<QCResult> {
  const prompt = `You are a strict brand-safety and quality-control reviewer for an AI-generated advertising video.
You only have the script and metadata (not the raw video frames) — review the script for issues.

Script: ${JSON.stringify(input.script)}
Expected CTA: ${input.cta ?? "none specified"}
Expected landing URL: ${input.landingUrl ?? "none specified"}
Expected phone: ${input.brandPhone ?? "none specified"}

Check for:
1. Financial guarantees or unsupported investment return claims
2. Medical claims
3. Legal guarantees
4. Government affiliation claims
5. Celebrity likeness references
6. Unverified testimonials or property claims
7. Offensive or unsafe content
8. Whether the CTA in the script matches the expected CTA

Return ONLY strict JSON:
{
  "approved": boolean,
  "score": number (0-100),
  "issues": string[],
  "requires_human_review": boolean,
  "flagged_categories": string[]
}
Set requires_human_review=true if ANY mandatory-review category (financial guarantee, medical claim, legal
guarantee, government affiliation, celebrity likeness, unverified claim) is present.`;

  return generateJson<QCResult>({ modelKey: input.modelKey, prompt, temperature: 0.2 });
}
