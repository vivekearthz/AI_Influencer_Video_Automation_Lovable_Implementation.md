// deno-lint-ignore-file no-explicit-any
// -----------------------------------------------------------------------------
// Veo video client (spec §3.2, §21). Veo generation is long-running: a
// `predictLongRunning` call returns an operation name that must be polled.
// Model id (e.g. "veo-3.1-lite-generate-preview") always comes from
// `ai_models.model_key`, never hard-coded, so pricing/model changes only
// require a database update (spec §22, §77-78).
//
// IMPORTANT: Google's video-generation endpoint shape has changed across
// previews. Verify the exact path/response fields against
// https://ai.google.dev/gemini-api/docs/video before going to production —
// this client isolates that surface behind generateVideo()/getVideoStatus()
// so only this file needs updating if the API shape changes.
// -----------------------------------------------------------------------------

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function requireApiKey(): string {
  const key = Deno.env.get("VEO_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("VEO_API_KEY / GEMINI_API_KEY is not configured for this project.");
  return key;
}

export interface VeoGenerateInput {
  modelKey: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  resolution: "720p" | "1080p" | "4k";
  durationSeconds: number;
  generateAudio: boolean;
  referenceImageUrl?: string;
}

export interface VeoOperation {
  operationName: string;
  done: boolean;
  videoUri?: string;
  error?: string;
}

export async function generateVideo(input: VeoGenerateInput): Promise<VeoOperation> {
  const apiKey = requireApiKey();
  const url = `${GEMINI_BASE_URL}/models/${input.modelKey}:predictLongRunning?key=${apiKey}`;

  const instance: Record<string, unknown> = { prompt: input.prompt };
  if (input.referenceImageUrl) {
    instance.image = { imageUri: input.referenceImageUrl };
  }

  const body = {
    instances: [instance],
    parameters: {
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      durationSeconds: input.durationSeconds,
      generateAudio: input.generateAudio,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veo predictLongRunning failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return { operationName: json.name, done: Boolean(json.done), videoUri: json.response?.videoUri };
}

export async function getVideoStatus(operationName: string): Promise<VeoOperation> {
  const apiKey = requireApiKey();
  const url = `${GEMINI_BASE_URL}/${operationName}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veo operation status check failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    return { operationName, done: true, error: json.error.message ?? "Unknown Veo error" };
  }

  const videoUri =
    json.response?.videoUri ??
    json.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ??
    undefined;

  return { operationName, done: Boolean(json.done), videoUri };
}

/**
 * Rough cost estimate from spec §3.2 pricing snapshot. This MUST be treated
 * as a fallback default only — real cost accounting should read the
 * provider's actual billing response when available (spec §3.2, §77-78).
 */
export function estimateVeoCost(modelKey: string, resolution: "720p" | "1080p" | "4k", durationSeconds: number): number {
  const isFast = modelKey.includes("fast");
  const perSecond = isFast ? (resolution === "1080p" ? 0.12 : 0.1) : resolution === "1080p" ? 0.08 : 0.05;
  return Number((perSecond * durationSeconds).toFixed(4));
}
