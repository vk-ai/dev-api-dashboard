import { assignVariant, ONBOARDING_EXPERIMENT, type ExperimentEventType } from "@/lib/experiment";
import { handle, json, readJson } from "@/lib/http";
import { ServiceError } from "@/lib/keyService";
import { getStore } from "@/lib/store";

const TYPES: ExperimentEventType[] = ["step_completed", "converted"];

export async function POST(req: Request) {
  return handle(async () => {
    const { userId, type, step } = await readJson(req);
    if (typeof userId !== "string" || !/^[\w-]{4,64}$/.test(userId)) throw new ServiceError(400, "invalid userId");
    if (!TYPES.includes(type as ExperimentEventType)) throw new ServiceError(400, "invalid event type");
    const store = getStore();
    const event = {
      experimentId: ONBOARDING_EXPERIMENT,
      userId,
      // Variant is recomputed server-side; the client cannot choose it.
      variant: assignVariant(userId),
      type: type as ExperimentEventType,
      step: typeof step === "string" ? step.slice(0, 32) : undefined,
      at: new Date().toISOString(),
      source: "live" as const,
    };
    store.events.push(event);
    return json({ event }, 201);
  });
}
