// deno-lint-ignore-file no-explicit-any
import { getServiceClient, getUserClient } from "./supabaseClient.ts";

/**
 * Loads a campaign using the CALLER's JWT (so RLS enforces workspace
 * membership) rather than blindly trusting a campaignId in the request
 * body. Every Edge Function that mutates campaign state should call this
 * first and reject if it returns null.
 */
export async function getCampaignForCaller(req: Request, campaignId: string) {
  const userClient = getUserClient(req);
  const { data, error } = await userClient.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCampaignAdmin(campaignId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
  if (error) throw error;
  return data;
}

export async function updateCampaignStatus(campaignId: string, status: string, extra: Record<string, unknown> = {}) {
  const supabase = getServiceClient();
  const { error } = await supabase.from("campaigns").update({ status, ...extra }).eq("id", campaignId);
  if (error) throw error;
}
