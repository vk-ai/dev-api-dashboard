import { describe, expect, it } from "vitest";
import { analyze, assignVariant, seedExperimentEvents, SEED_CONFIG, ONBOARDING_EXPERIMENT } from "@/lib/experiment";

describe("experiment", () => {
  it("assignment is deterministic and roughly 50/50", () => {
    expect(assignVariant("user-1")).toBe(assignVariant("user-1"));
    let a = 0;
    for (let i = 0; i < 10000; i++) if (assignVariant(`u${i}`) === "A") a++;
    expect(a).toBeGreaterThan(4800);
    expect(a).toBeLessThan(5200);
  });
  it("assignment depends on the experiment id", () => {
    const diff = Array.from({ length: 200 }, (_, i) => `u${i}`).filter(
      (u) => assignVariant(u, "exp-1") !== assignVariant(u, "exp-2"),
    ).length;
    expect(diff).toBeGreaterThan(60);
  });
  it("seeded analysis recovers the configured rates and is reproducible", () => {
    const a1 = analyze(seedExperimentEvents());
    const a2 = analyze(seedExperimentEvents());
    expect(a1).toEqual(a2);
    const [A, B] = a1.variants;
    expect(A.exposed + B.exposed).toBe(SEED_CONFIG.users);
    expect(Math.abs(A.rate - SEED_CONFIG.trueRateA)).toBeLessThan(0.03);
    expect(Math.abs(B.rate - SEED_CONFIG.trueRateB)).toBeLessThan(0.03);
    expect(a1.test).not.toBeNull();
    expect(a1.srm.pValue).toBeGreaterThan(0.001);
  });
  it("counts unique users and ignores conversions without exposure", () => {
    const at = new Date().toISOString();
    const v = assignVariant("x1");
    const base = { experimentId: ONBOARDING_EXPERIMENT, variant: v, at, source: "live" as const };
    const r = analyze([
      { ...base, userId: "x1", type: "exposure" },
      { ...base, userId: "x1", type: "exposure" },
      { ...base, userId: "x1", type: "converted" },
      { ...base, userId: "x1", type: "converted" },
      { ...base, userId: "ghost", type: "converted" },
    ]);
    const s = r.variants.find((x) => x.variant === v)!;
    expect(s).toMatchObject({ exposed: 1, converted: 1, rate: 1 });
    expect(r.test).toBeNull();
    expect(r.liveEvents).toBe(5);
  });
});
