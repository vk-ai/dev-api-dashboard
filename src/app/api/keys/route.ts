import { handle, json, readJson } from "@/lib/http";
import { createKey, listKeys } from "@/lib/keyService";
import { getStore } from "@/lib/store";

export async function GET() {
  return handle(() => json({ keys: listKeys(getStore()) }));
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const { key, secret } = createKey(getStore(), body.name);
    // The plaintext secret is returned exactly once, here.
    return json({ key, secret }, 201);
  });
}
