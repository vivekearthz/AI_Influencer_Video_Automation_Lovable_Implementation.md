// deno-lint-ignore-file no-explicit-any
import { getServiceClient } from "./supabaseClient.ts";

/**
 * Every asynchronous job in this platform must be idempotent (spec §33).
 * Build a deterministic key and short-circuit if a job with that key
 * already exists in a non-terminal-failure state.
 */
export function buildIdempotencyKey(...parts: (string | number | null | undefined)[]) {
  return parts.filter((p) => p !== null && p !== undefined).join(":");
}

export async function findExistingJob(idempotencyKey: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findExistingPublishJob(idempotencyKey: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("social_publish_jobs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}
