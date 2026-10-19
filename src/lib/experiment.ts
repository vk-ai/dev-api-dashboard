import { createHash } from "node:crypto";
import { mulberry32 } from "./random";
import { sampleRatioMismatch, twoProportionZTest, type TwoProportionResult } from "./stats";

export type Variant = "A" | "B";
export const ONBOARDING_EXPERIMENT = "onboarding-quickstart-v1";

export const VARIANT_DESCRIPTIONS: Record<Variant, string> = {
  A: "Control: 3-step checklist (name project, create key, read docs)",
  B: "Treatment: single-step quickstart with copyable curl snippet",
};

/** Deterministic 50/50 bucketing: same user + experiment always gets the same variant. */
export function assignVariant(userId: string, experimentId = ONBOARDING_EXPERIMENT): Variant {
  const digest = createHash("sha256").update(`${experimentId}:${userId}`).digest();
  const bucket = digest.readUInt32BE(0) / 0x100000000;
  return bucket < 0.5 ? "A" : "B";
}

export type ExperimentEventType = "exposure" | "step_completed" | "converted";

export interface ExperimentEvent {
  experimentId: string;
  userId: string;
  variant: Variant;
  type: ExperimentEventType;
  step?: string;
  at: string;
  source: "seed" | "live";
}

/** Seeded synthetic traffic. True rates are known so the analysis can be checked. */
export const SEED_CONFIG = { users: 4000, trueRateA: 0.3, trueRateB: 0.35, seed: 42 } as const;

export function seedExperimentEvents(cfg = SEED_CONFIG): ExperimentEvent[] {
  const rand = mulberry32(cfg.seed);
  const events: ExperimentEvent[] = [];
  const base = Date.UTC(2026, 8, 1);
  for (let i = 0; i < cfg.users; i++) {
    const userId = `seed-user-${i}`;
    const variant = assignVariant(userId);
    const at = new Date(base + i * 60_000).toISOString();
    events.push({ experimentId: ONBOARDING_EXPERIMENT, userId, variant, type: "exposure", at, source: "seed" });
    const p = variant === "A" ? cfg.trueRateA : cfg.trueRateB;
    if (rand() < p) {
      events.push({ experimentId: ONBOARDING_EXPERIMENT, userId, variant, type: "converted", at, source: "seed" });
    }
  }
  return events;
}

export interface VariantSummary {
  variant: Variant;
  exposed: number;
  converted: number;
  rate: number;
}

export interface ExperimentAnalysis {
  experimentId: string;
  variants: VariantSummary[];
  test: TwoProportionResult | null;
  srm: { chi2: number; pValue: number };
  liveEvents: number;
}

/** Unique-user analysis: a user counts once for exposure and once for conversion. */
export function analyze(events: ExperimentEvent[], experimentId = ONBOARDING_EXPERIMENT): ExperimentAnalysis {
  const exposed: Record<Variant, Set<string>> = { A: new Set(), B: new Set() };
  const converted: Record<Variant, Set<string>> = { A: new Set(), B: new Set() };
  let liveEvents = 0;
  for (const e of events) {
    if (e.experimentId !== experimentId) continue;
    if (e.source === "live") liveEvents++;
    if (e.type === "exposure") exposed[e.variant].add(e.userId);
    if (e.type === "converted") converted[e.variant].add(e.userId);
  }
  // Only count conversions from users who were exposed.
  const variants: VariantSummary[] = (["A", "B"] as const).map((v) => {
    const conv = [...converted[v]].filter((u) => exposed[v].has(u)).length;
    const n = exposed[v].size;
    return { variant: v, exposed: n, converted: conv, rate: n ? conv / n : 0 };
  });
  const [a, b] = variants;
  const test = a.exposed > 0 && b.exposed > 0 ? twoProportionZTest(a.converted, a.exposed, b.converted, b.exposed) : null;
  return { experimentId, variants, test, srm: sampleRatioMismatch(a.exposed, b.exposed), liveEvents };
}
