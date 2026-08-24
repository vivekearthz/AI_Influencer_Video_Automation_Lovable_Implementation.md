// deno-lint-ignore-file no-explicit-any
import { getServiceClient } from "./supabaseClient.ts";

/**
 * Maps a provider_key (ai_providers.provider_key / platform_catalog secrets)
 * to the Edge Function secret name(s) that must be set for it to be usable.
 * This is the *only* place provider secrets are referenced by name — actual
 * values are read from Deno.env at call time inside each provider client.
 */
export const PROVIDER_ENV_REQUIREMENTS: Record<string, string[]> = {
  gemini: ["GEMINI_API_KEY"],
  veo: ["GEMINI_API_KEY"], // Veo is called through the same Gemini API key by default
  elevenlabs: ["ELEVENLABS_API_KEY"],
  kling: ["KLING_API_KEY"],
  canva: ["CANVA_API_KEY"],
  meta: ["META_APP_ID", "META_APP_SECRET"],
  linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  x: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  third_party_publisher: ["THIRD_PARTY_PUBLISHER_API_KEY"],
  whatsapp_cloud: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  email_transactional: ["EMAIL_PROVIDER_KEY"],
};

export function isProviderConfigured(providerKey: string): boolean {
  const requiredVars = PROVIDER_ENV_REQUIREMENTS[providerKey] ?? [];
  if (!requiredVars.length) return false;
  return requiredVars.every((name) => Boolean(Deno.env.get(name)));
}

export interface ProviderWithModels {
  id: string;
  provider_key: string;
  provider_name: string;
  provider_type: string;
  enabled: boolean;
  priority: number;
  cost_score: number;
  quality_score: number;
  latency_score: number;
  supports_portrait: boolean;
  supports_audio: boolean;
  supports_reference_image: boolean;
  configured: boolean;
}

export async function listProvidersForCapability(capability: string): Promise<ProviderWithModels[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("ai_providers")
    .select("*")
    .contains("capabilities", JSON.stringify([capability]))
    .eq("enabled", true)
    .order("priority", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    ...p,
    configured: isProviderConfigured(p.provider_key),
  }));
}

export async function getDefaultModel(providerId: string, capability: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("ai_models")
    .select("*")
    .eq("provider_id", providerId)
    .eq("capability", capability)
    .eq("enabled", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Provider-agnostic selection (spec §5): among configured + enabled
 * providers for a capability, pick the best-scoring one. Throws if none are
 * configured, per spec ("No compatible video provider is configured") —
 * callers must not silently fall back to fake output.
 */
export async function selectProviderForCapability(capability: string) {
  const providers = await listProvidersForCapability(capability);
  const usable = providers.filter((p) => p.configured);

  if (!usable.length) {
    const err = new Error(`No configured provider is available for capability "${capability}"`);
    (err as any).code = "NO_PROVIDER_CONFIGURED";
    throw err;
  }

  const scored = usable
    .map((p) => ({
      provider: p,
      score: p.cost_score * 0.5 + (100 - p.quality_score) * 0.3 + p.latency_score * 0.2,
    }))
    .sort((a, b) => a.score - b.score);

  return scored[0].provider;
}
