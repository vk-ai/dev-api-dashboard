import { describe, expect, it } from "vitest";
import { erf, normalCdf, sampleRatioMismatch, twoProportionZTest } from "@/lib/stats";

describe("stats", () => {
  it("erf / normal CDF match reference values", () => {
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(erf(1)).toBeCloseTo(0.8427008, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 5);
    expect(normalCdf(-1.644854)).toBeCloseTo(0.05, 5);
  });
  it("two-proportion z-test matches a hand-computed example", () => {
    // 200/1000 vs 250/1000: pooled p = 0.225, se = sqrt(.225*.775*.002) = 0.018675
    const r = twoProportionZTest(200, 1000, 250, 1000);
    expect(r.z).toBeCloseTo(0.05 / 0.0186748, 3);
    expect(r.pValue).toBeCloseTo(0.00739, 4);
    expect(r.significant).toBe(true);
    expect(r.ci95[0]).toBeGreaterThan(0);
  });
  it("identical rates are not significant", () => {
    const r = twoProportionZTest(100, 500, 100, 500);
    expect(r.z).toBe(0);
    expect(r.pValue).toBeCloseTo(1, 6);
    expect(r.significant).toBe(false);
  });
  it("rejects empty samples", () => {
    expect(() => twoProportionZTest(0, 0, 1, 10)).toThrow();
  });
  it("SRM flags a broken split but not a fair one", () => {
    expect(sampleRatioMismatch(5000, 5000).pValue).toBeCloseTo(1, 6);
    expect(sampleRatioMismatch(5300, 4700).pValue).toBeLessThan(0.001);
  });
});
