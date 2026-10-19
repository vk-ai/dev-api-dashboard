import { findBySecret, newKeyRecord, toView, validateName, type ApiKeyView } from "./apiKeys";
import type { Store } from "./store";
import { MODELS } from "./usage";

export class ServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const MAX_ACTIVE_KEYS = 10;

export function listKeys(store: Store): ApiKeyView[] {
  return [...store.keys].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toView);
}

export function createKey(store: Store, rawName: unknown, now = new Date()): { key: ApiKeyView; secret: string } {
  const name = validateName(rawName);
  if (!name) throw new ServiceError(400, "name must be 1-64 chars: letters, digits, space, . _ -");
  if (store.keys.filter((k) => k.status === "active").length >= MAX_ACTIVE_KEYS) {
    throw new ServiceError(409, `limit of ${MAX_ACTIVE_KEYS} active keys reached`);
  }
  const { record, secret } = newKeyRecord(name, now);
  store.keys.push(record);
  return { key: toView(record), secret };
}

export function revokeKey(store: Store, id: string, now = new Date()): ApiKeyView {
  const k = store.keys.find((r) => r.id === id);
  if (!k) throw new ServiceError(404, "key not found");
  if (k.status === "revoked") throw new ServiceError(409, "key already revoked");
  k.status = "revoked";
  k.revokedAt = now.toISOString();
  return toView(k);
}

/** Rotation = issue a new key with the same name, then revoke the old one. */
export function rotateKey(store: Store, id: string, now = new Date()): { key: ApiKeyView; secret: string; revoked: ApiKeyView } {
  const old = store.keys.find((r) => r.id === id);
  if (!old) throw new ServiceError(404, "key not found");
  if (old.status === "revoked") throw new ServiceError(409, "cannot rotate a revoked key");
  const { record, secret } = newKeyRecord(old.name, now, old.id);
  store.keys.push(record);
  old.status = "revoked";
  old.revokedAt = now.toISOString();
  return { key: toView(record), secret, revoked: toView(old) };
}

/** Authenticate a bearer token and meter one request. */
export function meterRequest(
  store: Store,
  authHeader: string | null,
  model: string,
  characters: number,
  now = new Date(),
): { keyId: string; model: string; characters: number } {
  const token = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new ServiceError(401, "missing bearer token");
  const rec = findBySecret(store.keys, token);
  if (!rec) throw new ServiceError(401, "invalid api key");
  if (rec.status !== "active") throw new ServiceError(401, "api key revoked");
  if (!MODELS.includes(model)) throw new ServiceError(400, `unknown model; one of ${MODELS.join(", ")}`);
  if (!Number.isInteger(characters) || characters < 1 || characters > 100_000) {
    throw new ServiceError(400, "characters must be an integer in 1..100000");
  }
  rec.lastUsedAt = now.toISOString();
  const date = now.toISOString().slice(0, 10);
  const row = store.usage.find((u) => u.date === date && u.keyId === rec.id && u.model === model);
  if (row) {
    row.requests += 1;
    row.characters += characters;
  } else {
    store.usage.push({ date, keyId: rec.id, model, requests: 1, characters });
  }
  return { keyId: rec.id, model, characters };
}
