// POST /functions/v1/social-health-check  { workspaceId: string, accountId?: string }
// Checks token validity for connected social accounts (spec §65-66).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { resolveAccessToken } from "../_shared/social/tokenResolver.ts";

async function pingLinkedIn(token: string) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

async function pingMeta(token: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
  return res.ok;
}

async function pingGoogle(token: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + token);
  return res.ok;
}

const PINGERS: Record<string, (token: string) => Promise<boolean>> = {
  linkedin: pingLinkedIn,
  instagram: pingMeta,
  facebook: pingMeta,
  youtube: pingGoogle,
};

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.workspaceId) return jsonResponse({ error: "workspaceId is required" }, { status: 400 });

    const supabase = getServiceClient();
    let query = supabase.from("social_accounts").select("*").eq("workspace_id", body.workspaceId);
    if (body.accountId) query = query.eq("id", body.accountId);
    const { data: accounts, error } = await query;
    if (error) throw error;

    const results = [];
    for (const account of accounts ?? []) {
      const token = resolveAccessToken(account.credential_ref);
      let status: string;

      if (!token) {
        status = "reauthorization_required";
      } else {
        const pinger = PINGERS[account.platform_key];
        if (!pinger) {
          status = "connected"; // no live-ping adapter for this platform; presence of token is the best signal
        } else {
          try {
            status = (await pinger(token)) ? "connected" : "reauthorization_required";
          } catch {
            status = "error";
          }
        }
      }

      await supabase
        .from("social_accounts")
        .update({ status, last_health_check: new Date().toISOString() })
        .eq("id", account.id);

      results.push({ accountId: account.id, platform: account.platform_key, status });
    }

    return jsonResponse({ success: true, results });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
