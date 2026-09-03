import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Push subscriptions (endpoint URL + encryption keys) let whoever holds them send notifications to a phone,
 * so the subscriber list is sealed with AES-256-GCM before it is written to storage. Key = PUSH_STORE_SECRET
 * (64 hex chars). Format: base64url( nonce(12) | tag(16) | ciphertext ).
 */
function keyFrom(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex ?? "")) throw new Error("PUSH_STORE_SECRET must be 64 hex characters (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function seal(value: unknown, secretHex: string): string {
  const key = keyFrom(secretHex);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, body]).toString("base64url");
}

export function open<T = unknown>(sealed: string, secretHex: string): T {
  const key = keyFrom(secretHex);
  const raw = Buffer.from(sealed, "base64url");
  if (raw.length < 28) throw new Error("sealed payload too short");
  const nonce = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  return JSON.parse(plain) as T;
}
