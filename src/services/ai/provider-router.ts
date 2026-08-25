// Provider router (spec §5). Pure, dependency-free scoring logic so it can
// be unit-tested and reused for "estimated provider" previews in the UI.
// The authoritative selection for an actual generation run happens
// server-side in supabase/functions/_shared/providerRouter.ts, which mirrors
// this scoring function against live health-check data.

import type { VideoProviderLike, VideoRequest } from "./types";

/**
 * Lower score wins. Combines cost, (inverted) quality, and latency, then
 * disqualifies providers that cannot satisfy hard requirements.
 */
export function providerScore(provider: VideoProviderLike, request: VideoRequest): number {
  const hardRequirementPenalty =
    (request.generateAudio && !provider.supportsAudio ? 1000 : 0) +
    (request.aspectRatio === "9:16" && !provider.supportsPortrait ? 1000 : 0) +
    ((request.referenceImages?.length ?? 0) > 0 && !provider.supportsReferenceImage ? 1000 : 0) +
    (!provider.enabled || !provider.healthy ? 5000 : 0);

  const costWeight = 0.5;
  const qualityWeight = 0.3;
  const latencyWeight = 0.2;

  const weightedScore =
    provider.costScore * costWeight +
    (100 - provider.qualityScore) * qualityWeight +
    provider.latencyScore * latencyWeight;

  return weightedScore + hardRequirementPenalty;
}

export async function selectVideoProvider(
  request: VideoRequest,
  providers: VideoProviderLike[]
): Promise<VideoProviderLike> {
  const available = providers.filter((provider) => provider.enabled && provider.healthy);

  if (!available.length) {
    throw new Error("No compatible video provider is configured");
  }

  const scored = [...available].sort((a, b) => providerScore(a, request) - providerScore(b, request));

  const best = scored[0];
  if (providerScore(best, request) >= 1000) {
    throw new Error("No configured video provider satisfies this request's requirements");
  }

  return best;
}

export function estimateVideoCost(provider: VideoProviderLike, costPerSecond: number, durationSeconds: number) {
  return Number((costPerSecond * durationSeconds).toFixed(4));
}
