// POST /functions/v1/provider-health-check  { workspaceId: string }
// Verifies which AI providers actually have their secret configured (spec §4,
// §65). This never assumes a provider works just because it's enabled in the
// UI — it checks for the presence of the required Edge Function secret(s).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabaseClient.ts";
import { PROVIDER_ENV_REQUIREMENTS, isProviderConfigured } from "../_shared/providerRegistry.ts";
import { writeAuditLog } from "../_shared/audit.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId;
    if (!workspaceId) return jsonResponse({ error: "workspaceId is required" }, { status: 400 });

    const supabase = getServiceClient();
    const { data: providers, error } = await supabase.from("ai_providers").select("*");
    if (error) throw error;

    const results = [];
    for (const provider of providers ?? []) {
      const configured = isProviderConfigured(provider.provider_key);
      const status = configured ? "healthy" : "not_configured";

      const { data: existing } = await supabase
        .from("ai_provider_credentials")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("provider_id", provider.id)
        .maybeSingle();

      const requiredVars = PROVIDER_ENV_REQUIREMENTS[provider.provider_key] ?? [];
      const payload = {
        workspace_id: workspaceId,
        provider_id: provider.id,
        credential_ref: requiredVars[0] ?? provider.provider_key.toUpperCase(),
        health_status: status,
        last_health_check: new Date().toISOString(),
        health_detail: { requiredSecrets: requiredVars, configured },
      };

      if (existing) {
        await supabase.from("ai_provider_credentials").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("ai_provider_credentials").insert(payload);
      }

      results.push({ providerKey: provider.provider_key, status });
    }

    // Also refresh social account health (native platforms only need a token
    // presence check here — a full API ping happens in social-health-check).
    const { data: accounts } = await supabase.from("social_accounts").select("*").eq("workspace_id", workspaceId);
    for (const account of accounts ?? []) {
      const hasToken = account.credential_ref ? Boolean(Deno.env.get(account.credential_ref)) : false;
      await supabase
        .from("social_accounts")
        .update({
          status: hasToken ? "connected" : "reauthorization_required",
          last_health_check: new Date().toISOString(),
        })
        .eq("id", account.id);
    }

    await writeAuditLog({ workspaceId, action: "provider_health_check_run", metadata: { checked: results.length } });

    return jsonResponse({ success: true, results });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
