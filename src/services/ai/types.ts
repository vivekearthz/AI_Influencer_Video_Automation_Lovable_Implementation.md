// Provider-agnostic AI service contracts (spec §4-5, §17).
// These types are shared conceptually between the frontend (for display /
// cost estimation) and the Supabase Edge Functions (supabase/functions/_shared)
// which contain the actual server-side implementations that call provider
// APIs with secrets. Keep the two in sync when the shape changes.

export type ProviderCapability =
  | "text"
  | "image"
  | "video"
  | "avatar"
  | "tts"
  | "music"
  | "storage"
  | "social"
  | "email"
  | "whatsapp";

export interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  priority: number;
  costScore: number;
  qualityScore: number;
  latencyScore: number;
  supportsPortrait: boolean;
  supportsAudio: boolean;
  supportsReferenceImage: boolean;
  supportsAsyncJobs: boolean;
}

export interface VideoRequest {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  resolution: "720p" | "1080p" | "4k";
  referenceImages?: string[];
  generateAudio: boolean;
}

export type JobLifecycleStatus = "queued" | "processing" | "completed" | "failed";

export interface VideoResult {
  provider: string;
  jobId: string;
  status: JobLifecycleStatus;
  videoUrl?: string;
  audioUrl?: string;
  estimatedCost?: number;
}

export interface VideoProviderLike {
  id: string;
  costScore: number;
  qualityScore: number;
  latencyScore: number;
  supportsAudio: boolean;
  supportsPortrait: boolean;
  supportsReferenceImage: boolean;
  enabled: boolean;
  healthy: boolean;
}

export interface CostPolicy {
  maxCostPerVideo: number;
  maxRetries: number;
  preferredQuality: "economy" | "balanced" | "premium";
}

export const QUALITY_PROFILE_DEFAULTS: Record<
  CostPolicy["preferredQuality"],
  { resolution: "720p" | "1080p" | "4k"; retries: number }
> = {
  economy: { resolution: "720p", retries: 1 },
  balanced: { resolution: "1080p", retries: 2 },
  premium: { resolution: "1080p", retries: 3 },
};
