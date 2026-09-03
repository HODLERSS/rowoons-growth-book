import { describe, expect, it } from "vitest";
import { seal, open } from "../push-crypto";

const KEY = "a".repeat(64); // 32 bytes hex
const OTHER = "b".repeat(64);

describe("push subscription store encryption", () => {
  it("round-trips JSON through seal/open", () => {
    const subs = [{ endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "p", auth: "a" } }];
    const sealed = seal(subs, KEY);
    expect(typeof sealed).toBe("string");
    expect(sealed).not.toContain("web.push.apple.com");
    expect(open(sealed, KEY)).toEqual(subs);
  });
  it("produces a different ciphertext each time (random nonce)", () => {
    expect(seal({ a: 1 }, KEY)).not.toBe(seal({ a: 1 }, KEY));
  });
  it("rejects a wrong key or tampered data", () => {
    const sealed = seal({ a: 1 }, KEY);
    expect(() => open(sealed, OTHER)).toThrow();
    const tampered = sealed.slice(0, -4) + "AAAA";
    expect(() => open(tampered, KEY)).toThrow();
  });
  it("rejects a malformed key", () => {
    expect(() => seal({ a: 1 }, "short")).toThrow(/64 hex/);
  });
});
