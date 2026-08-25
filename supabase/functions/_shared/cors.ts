export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    })
  );
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return withCors(new Response("ok", { status: 200 }));
  }
  return null;
}
