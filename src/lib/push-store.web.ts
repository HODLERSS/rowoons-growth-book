import { get, put } from "@vercel/blob";
import { open, seal } from "./push-crypto";

/**
 * Web push subscriber list, kept as one encrypted blob (`push/subscriptions.v1`) in a Vercel Blob store. The store
 * is public-read, so the blob holds only AES-256-GCM ciphertext (see push-crypto.ts); without PUSH_STORE_SECRET
 * it is noise. The list is tiny (a few phones), so a read-modify-write per change is fine. Server routes only.
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PATH = "push/subscriptions.v1";

function secret(): string {
  const s = process.env.PUSH_STORE_SECRET;
  if (!s) throw new Error("PUSH_STORE_SECRET is not set");
  return s;
}

export async function readSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const res = await get(PATH, { access: "public", useCache: false });
  if (!res) return [];
  const text = await new Response(res.stream).text();
  if (!text) return [];
  const list = open<PushSubscriptionJSON[]>(text, secret());
  return Array.isArray(list) ? list : [];
}

export async function writeSubscriptions(list: PushSubscriptionJSON[]): Promise<void> {
  await put(PATH, seal(list, secret()), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
}

export function isSubscription(v: unknown): v is PushSubscriptionJSON {
  if (!v || typeof v !== "object") return false;
  const o = v as PushSubscriptionJSON;
  return typeof o.endpoint === "string" && /^https:\/\//.test(o.endpoint) && !!o.keys && typeof o.keys.p256dh === "string" && typeof o.keys.auth === "string";
}
