import { handle, json } from "@/lib/http";
import { revokeKey } from "@/lib/keyService";
import { getStore } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    return json({ key: revokeKey(getStore(), id) });
  });
}
