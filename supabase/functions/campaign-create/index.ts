// POST /functions/v1/campaign-create
// Server-side campaign creation (spec §47-48). The frontend normally inserts
// directly via supabase-js (RLS already scopes it to the caller's
// workspace), but this endpoint exists for external integrations / future
// automation that should not need a Supabase session.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getUserClient } from "../_shared/supabaseClient.ts";
import { writeAuditLog } from "../_shared/audit.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });

    const body = await req.json();
    if (!body.workspaceId) return jsonResponse({ error: "workspaceId is required" }, { status: 400 });
    if (!body.name) return jsonResponse({ error: "name is required" }, { status: 400 });

    const userClient = getUserClient(req);
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return jsonResponse({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await userClient
      .from("campaigns")
      .insert({
        workspace_id: body.workspaceId,
        name: body.name,
        objective: body.objective,
        product_name: body.productName,
        product_description: body.productDescription,
        target_audience: body.targetAudience,
        language: body.language ?? "English",
        tone: body.tone ?? "professional",
        style: body.style,
        duration_seconds: body.durationSeconds ?? 30,
        aspect_ratio: body.aspectRatio ?? "9:16",
        quality_profile: body.qualityProfile ?? "economy",
        cta: body.cta,
        landing_url: body.landingUrl,
        whatsapp_enabled: Boolean(body.whatsappEnabled),
        email_enabled: Boolean(body.emailEnabled),
        target_channel_keys: body.targetChannelKeys ?? [],
        publish_to_all_connected: body.publishToAllConnected ?? true,
        scheduled_at: body.scheduledAt ?? null,
        created_by: userRes.user.id,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) throw error;

    await writeAuditLog({
      workspaceId: body.workspaceId,
      userId: userRes.user.id,
      action: "campaign_created",
      resourceType: "campaign",
      resourceId: data.id,
    });

    return jsonResponse({ success: true, campaign: data, status: "created" });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
