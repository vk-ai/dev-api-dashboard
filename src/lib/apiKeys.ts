import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type ApiKeyStatus = "active" | "revoked";

/** What we persist. The plaintext secret is never stored. */
export interface ApiKeyRecord {
  id: string;
  name: string;
  /** First characters of the key, safe to display (e.g. "dk_live_AbC1"). */
  prefix: string;
  /** Hex SHA-256 of the full secret. */
  hash: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  /** Set when this key was created by rotating another key. */
  rotatedFrom: string | null;
  status: ApiKeyStatus;
}

/** Public view: never includes the hash or secret. */
export type ApiKeyView = Omit<ApiKeyRecord, "hash">;

export const KEY_PREFIX = "dk_demo_";
export const DISPLAY_PREFIX_LEN = KEY_PREFIX.length + 4;

export function hashSecret(secret: string): string {
  // API keys are 192-bit random tokens, so a fast hash is appropriate
  // (unlike user passwords, which need a slow KDF).
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateSecret(): string {
  return KEY_PREFIX + randomBytes(24).toString("base64url");
}

export function newKeyRecord(
  name: string,
  now: Date,
  rotatedFrom: string | null = null,
): { record: ApiKeyRecord; secret: string } {
  const secret = generateSecret();
  const record: ApiKeyRecord = {
    id: "key_" + randomBytes(6).toString("hex"),
    name,
    prefix: secret.slice(0, DISPLAY_PREFIX_LEN),
    hash: hashSecret(secret),
    createdAt: now.toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    rotatedFrom,
    status: "active",
  };
  return { record, secret };
}

export function toView(r: ApiKeyRecord): ApiKeyView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, ...view } = r;
  return view;
}

/** Constant-time comparison of a presented secret against stored hashes. */
export function findBySecret(
  records: ApiKeyRecord[],
  presented: string,
): ApiKeyRecord | undefined {
  if (!presented.startsWith(KEY_PREFIX)) return undefined;
  const h = Buffer.from(hashSecret(presented), "hex");
  let match: ApiKeyRecord | undefined;
  for (const r of records) {
    const stored = Buffer.from(r.hash, "hex");
    if (stored.length === h.length && timingSafeEqual(stored, h)) match = r;
  }
  return match;
}

export function validateName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  if (name.length < 1 || name.length > 64) return null;
  if (!/^[\w .\-]+$/.test(name)) return null;
  return name;
}
