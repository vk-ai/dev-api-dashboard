import { handle, json, readJson } from "@/lib/http";
import { meterRequest } from "@/lib/keyService";
import { getStore } from "@/lib/store";

/**
 * MOCK "product API": authenticates the API key and meters usage, but does not
 * synthesise any audio. It exists so the dashboard has a real key -> usage path.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const text = typeof body.text === "string" ? body.text : "";
    const model = typeof body.model === "string" ? body.model : "tts-standard";
    const metered = meterRequest(getStore(), req.headers.get("authorization"), model, text.length);
    return json({ ok: true, mocked: true, ...metered });
  });
}
