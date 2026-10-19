import { handle, json } from "@/lib/http";
import { rotateKey } from "@/lib/keyService";
import { getStore } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    return json(rotateKey(getStore(), id), 201);
  });
}
