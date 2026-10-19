import { newKeyRecord, type ApiKeyRecord } from "./apiKeys";
import { seedExperimentEvents, type ExperimentEvent } from "./experiment";
import { seedUsage, type UsageRecord } from "./usage";

/**
 * MOCK BACKEND: an in-memory store seeded with deterministic demo data.
 * State lives on globalThis so every route handler bundle shares one copy
 * within a single Node process. It resets on restart; nothing is persisted.
 */
export interface Store {
  keys: ApiKeyRecord[];
  usage: UsageRecord[];
  events: ExperimentEvent[];
  seededAt: string;
}

export const SEED_END = new Date(Date.UTC(2026, 9, 18));
export const SEED_DAYS = 30;

function createStore(): Store {
  const now = new Date(Date.UTC(2026, 8, 15));
  // Seed keys: secrets are generated and immediately discarded (only hashes kept).
  const prod = newKeyRecord("production-backend", now).record;
  const staging = newKeyRecord("staging", now).record;
  const old = newKeyRecord("old-laptop", now).record;
  old.status = "revoked";
  old.revokedAt = new Date(Date.UTC(2026, 9, 1)).toISOString();
  return {
    keys: [prod, staging, old],
    usage: seedUsage([prod.id, staging.id], SEED_DAYS, SEED_END),
    events: seedExperimentEvents(),
    seededAt: new Date().toISOString(),
  };
}

const g = globalThis as unknown as { __devApiStore?: Store };

export function getStore(): Store {
  if (!g.__devApiStore) g.__devApiStore = createStore();
  return g.__devApiStore;
}

export function resetStore(): Store {
  g.__devApiStore = createStore();
  return g.__devApiStore;
}
