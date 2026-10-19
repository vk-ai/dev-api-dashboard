import { mulberry32 } from "./random";

/** Fictional demo pricing (USD per 1,000 characters). Not any vendor's real price list. */
export const PRICING_PER_1K_CHARS: Record<string, number> = {
  "tts-standard": 0.18,
  "tts-turbo": 0.09,
  "dub-beta": 0.3,
};
export const MODELS = Object.keys(PRICING_PER_1K_CHARS);

export interface UsageRecord {
  date: string; // YYYY-MM-DD (UTC)
  keyId: string;
  model: string;
  requests: number;
  characters: number;
}

export function costOf(model: string, characters: number): number {
  const rate = PRICING_PER_1K_CHARS[model];
  if (rate === undefined) throw new Error(`unknown model ${model}`);
  return (characters / 1000) * rate;
}

export function seedUsage(keyIds: string[], days: number, end: Date, seed = 7): UsageRecord[] {
  const rand = mulberry32(seed);
  const out: UsageRecord[] = [];
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(endUtc - d * 86_400_000).toISOString().slice(0, 10);
    const weekday = new Date(endUtc - d * 86_400_000).getUTCDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.45 : 1;
    keyIds.forEach((keyId, ki) => {
      MODELS.forEach((model, mi) => {
        const base = [420, 260, 40][mi] * (ki === 0 ? 1 : 0.35);
        const requests = Math.round(base * weekendFactor * (0.7 + 0.6 * rand()));
        const characters = requests * Math.round(180 + 220 * rand());
        if (requests > 0) out.push({ date, keyId, model, requests, characters });
      });
    });
  }
  return out;
}

export interface DailyPoint {
  date: string;
  requests: number;
  characters: number;
  cost: number;
}

export function dailySeries(records: UsageRecord[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const r of records) {
    const p = byDate.get(r.date) ?? { date: r.date, requests: 0, characters: 0, cost: 0 };
    p.requests += r.requests;
    p.characters += r.characters;
    p.cost += costOf(r.model, r.characters);
    byDate.set(r.date, p);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ModelBreakdown {
  model: string;
  requests: number;
  characters: number;
  cost: number;
}

export function byModel(records: UsageRecord[]): ModelBreakdown[] {
  const m = new Map<string, ModelBreakdown>();
  for (const r of records) {
    const b = m.get(r.model) ?? { model: r.model, requests: 0, characters: 0, cost: 0 };
    b.requests += r.requests;
    b.characters += r.characters;
    b.cost += costOf(r.model, r.characters);
    m.set(r.model, b);
  }
  return [...m.values()].sort((a, b) => b.cost - a.cost);
}

export function filterDays(records: UsageRecord[], days: number, end: Date): UsageRecord[] {
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const start = new Date(endUtc - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return records.filter((r) => r.date >= start);
}
