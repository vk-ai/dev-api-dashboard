import { handle, json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { byModel, dailySeries, filterDays, PRICING_PER_1K_CHARS } from "@/lib/usage";

export async function GET(req: Request) {
  return handle(() => {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30) || 30));
    const keyId = url.searchParams.get("keyId");
    const store = getStore();
    const latest = store.usage.reduce((m, r) => (r.date > m ? r.date : m), "1970-01-01");
    let rows = filterDays(store.usage, days, new Date(latest + "T00:00:00Z"));
    if (keyId) rows = rows.filter((r) => r.keyId === keyId);
    const daily = dailySeries(rows);
    const models = byModel(rows);
    const totals = daily.reduce(
      (t, p) => ({ requests: t.requests + p.requests, characters: t.characters + p.characters, cost: t.cost + p.cost }),
      { requests: 0, characters: 0, cost: 0 },
    );
    return json({ days, daily, models, totals, pricing: PRICING_PER_1K_CHARS, mocked: true });
  });
}
