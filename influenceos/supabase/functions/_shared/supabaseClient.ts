// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set for this Edge Function.");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getUserClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY are not set for this Edge Function.");
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getCallerUser(req: Request) {
  const userClient = getUserClient(req);
  const { data } = await userClient.auth.getUser();
  return data.user;
}

export async function getCallerProfile(req: Request) {
  const userClient = getUserClient(req);
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes.user) return null;
  const { data } = await userClient.from("profiles").select("*").eq("id", userRes.user.id).maybeSingle();
  return data;
}
