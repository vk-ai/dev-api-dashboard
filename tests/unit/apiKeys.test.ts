import { describe, expect, it } from "vitest";
import { findBySecret, hashSecret, KEY_PREFIX, newKeyRecord, toView, validateName } from "@/lib/apiKeys";
import { createKey, listKeys, meterRequest, revokeKey, rotateKey, ServiceError, MAX_ACTIVE_KEYS } from "@/lib/keyService";
import { resetStore } from "@/lib/store";

describe("api key primitives", () => {
  it("stores only a hash and a short prefix", () => {
    const { record, secret } = newKeyRecord("ci", new Date());
    expect(secret.startsWith(KEY_PREFIX)).toBe(true);
    expect(record.hash).toBe(hashSecret(secret));
    expect(JSON.stringify(record)).not.toContain(secret);
    expect(secret.startsWith(record.prefix)).toBe(true);
    expect(record.prefix.length).toBeLessThan(secret.length / 2);
  });
  it("views never expose the hash", () => {
    const { record } = newKeyRecord("ci", new Date());
    expect(toView(record)).not.toHaveProperty("hash");
  });
  it("finds a key by secret and rejects others", () => {
    const a = newKeyRecord("a", new Date());
    const b = newKeyRecord("b", new Date());
    expect(findBySecret([a.record, b.record], b.secret)?.id).toBe(b.record.id);
    expect(findBySecret([a.record], b.secret)).toBeUndefined();
    expect(findBySecret([a.record], "not-a-key")).toBeUndefined();
  });
  it("validates names", () => {
    expect(validateName("  prod-1 ")).toBe("prod-1");
    expect(validateName("")).toBeNull();
    expect(validateName("<script>")).toBeNull();
    expect(validateName("x".repeat(65))).toBeNull();
    expect(validateName(3)).toBeNull();
  });
});

describe("key service", () => {
  it("lists keys without secrets or hashes", () => {
    const s = resetStore();
    const { secret } = createKey(s, "new-key");
    const listed = JSON.stringify(listKeys(s));
    expect(listed).not.toContain(secret);
    expect(listed).not.toContain(hashSecret(secret));
  });
  it("revokes once", () => {
    const s = resetStore();
    const { key } = createKey(s, "temp");
    expect(revokeKey(s, key.id).status).toBe("revoked");
    expect(() => revokeKey(s, key.id)).toThrow(ServiceError);
    expect(() => revokeKey(s, "nope")).toThrow(/not found/);
  });
  it("rotation issues a new secret and revokes the old key", () => {
    const s = resetStore();
    const first = createKey(s, "rotate-me");
    const rotated = rotateKey(s, first.key.id);
    expect(rotated.secret).not.toBe(first.secret);
    expect(rotated.key.rotatedFrom).toBe(first.key.id);
    expect(rotated.revoked.status).toBe("revoked");
    expect(() => meterRequest(s, `Bearer ${first.secret}`, "tts-turbo", 10)).toThrow(/revoked/);
    expect(meterRequest(s, `Bearer ${rotated.secret}`, "tts-turbo", 10).keyId).toBe(rotated.key.id);
  });
  it("meters usage and rejects bad auth", () => {
    const s = resetStore();
    const { key, secret } = createKey(s, "meter");
    meterRequest(s, `Bearer ${secret}`, "tts-standard", 1234);
    meterRequest(s, `Bearer ${secret}`, "tts-standard", 66);
    const rows = s.usage.filter((u) => u.keyId === key.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ requests: 2, characters: 1300 });
    expect(() => meterRequest(s, null, "tts-standard", 1)).toThrow(/missing/);
    expect(() => meterRequest(s, "Bearer dk_demo_wrong", "tts-standard", 1)).toThrow(/invalid/);
    expect(() => meterRequest(s, `Bearer ${secret}`, "gpt-9", 1)).toThrow(/unknown model/);
    expect(() => meterRequest(s, `Bearer ${secret}`, "tts-standard", 0)).toThrow(/characters/);
  });
  it("caps active keys", () => {
    const s = resetStore();
    const active = s.keys.filter((k) => k.status === "active").length;
    for (let i = active; i < MAX_ACTIVE_KEYS; i++) createKey(s, `k${i}`);
    expect(() => createKey(s, "one-too-many")).toThrow(/limit/);
  });
});
