import { describe, expect, it } from "vitest";
import { byModel, costOf, dailySeries, filterDays, seedUsage } from "@/lib/usage";

describe("usage", () => {
  const end = new Date(Date.UTC(2026, 9, 18));
  it("prices characters", () => {
    expect(costOf("tts-standard", 1000)).toBeCloseTo(0.18);
    expect(costOf("tts-turbo", 2500)).toBeCloseTo(0.225);
    expect(() => costOf("nope", 1)).toThrow();
  });
  it("seeds deterministic usage with lower weekends", () => {
    const a = seedUsage(["k1", "k2"], 30, end);
    expect(a).toEqual(seedUsage(["k1", "k2"], 30, end));
    const daily = dailySeries(a);
    expect(daily).toHaveLength(30);
    expect(daily[daily.length - 1].date).toBe("2026-10-18");
    const isWeekend = (d: string) => [0, 6].includes(new Date(d + "T00:00:00Z").getUTCDay());
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(avg(daily.filter((d) => isWeekend(d.date)).map((d) => d.requests))).toBeLessThan(
      avg(daily.filter((d) => !isWeekend(d.date)).map((d) => d.requests)) * 0.7,
    );
  });
  it("aggregates consistently", () => {
    const rows = seedUsage(["k1"], 10, end);
    const totalDaily = dailySeries(rows).reduce((s, d) => s + d.cost, 0);
    const totalModel = byModel(rows).reduce((s, m) => s + m.cost, 0);
    expect(totalDaily).toBeCloseTo(totalModel, 6);
    expect(dailySeries(filterDays(rows, 7, end))).toHaveLength(7);
  });
});
