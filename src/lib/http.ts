import { ServiceError } from "./keyService";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function handle(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: "invalid JSON body" }, 400);
    console.error(e);
    return json({ error: "internal error" }, 500);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text) return {};
  const v = JSON.parse(text);
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
