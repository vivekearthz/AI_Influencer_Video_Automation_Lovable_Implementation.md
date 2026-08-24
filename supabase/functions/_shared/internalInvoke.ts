// Server-to-server invocation of another Edge Function using the service
// role key. Each existing function (script-generate, video-generate, ...)
// already knows how to check whether work is needed and is idempotent, so
// the orchestrator can safely call them on every sweep without duplicating
// their logic.
export async function invokeFunction(name: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: any }> {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!baseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set for this Edge Function.");
  }

  const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response; leave data as null
  }

  return { ok: res.ok, data };
}
