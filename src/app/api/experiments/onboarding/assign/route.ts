import { assignVariant, ONBOARDING_EXPERIMENT } from "@/lib/experiment";
import { handle, json, readJson } from "@/lib/http";
import { ServiceError } from "@/lib/keyService";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const { userId } = await readJson(req);
    if (typeof userId !== "string" || !/^[\w-]{4,64}$/.test(userId)) throw new ServiceError(400, "invalid userId");
    const variant = assignVariant(userId);
    const store = getStore();
    const already = store.events.some(
      (e) => e.userId === userId && e.type === "exposure" && e.experimentId === ONBOARDING_EXPERIMENT,
    );
    if (!already) {
      store.events.push({
        experimentId: ONBOARDING_EXPERIMENT, userId, variant, type: "exposure", at: new Date().toISOString(), source: "live",
      });
    }
    return json({ experimentId: ONBOARDING_EXPERIMENT, variant });
  });
}
