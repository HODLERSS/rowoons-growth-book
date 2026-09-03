import { del, list, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { open, seal } from "./push-crypto";

/**
 * Web push subscribers in a Vercel Blob store: ONE blob per subscriber, named by a hash of its endpoint, holding
 * AES-256-GCM ciphertext (push-crypto.ts; without PUSH_STORE_SECRET the file is noise, so the store may be
 * public-read). Subscribe = put, unsubscribe = delete, send = list + fetch. There is deliberately no
 * read-modify-write of a shared list: Blob `list()` is eventually consistent and the CDN serves an overwritten
 * pathname stale for up to a minute, so a shared list silently lost entries in production. Per-subscriber
 * blobs make every write independent; at worst a brand-new subscriber shows up in `list()` a few seconds late.
 * Server routes only.
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PREFIX = "push/subs/";

function secret(): string {
  const s = process.env.PUSH_STORE_SECRET;
  if (!s) throw new Error("PUSH_STORE_SECRET is not set");
  return s;
}

export function subscriptionPath(endpoint: string): string {
  return `${PREFIX}${createHash("sha256").update(endpoint).digest("hex")}.v1`;
}

export async function addSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const clean: PushSubscriptionJSON = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  await put(subscriptionPath(sub.endpoint), seal(clean, secret()), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  const path = subscriptionPath(endpoint);
  const { blobs } = await list({ prefix: path, limit: 1 });
  if (!blobs.length) return false;
  await del(blobs.map((b) => b.url));
  return true;
}

export async function readSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const key = secret();
  const out: PushSubscriptionJSON[] = [];
  await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return;
        const sub = open<PushSubscriptionJSON>(await res.text(), key);
        if (isSubscription(sub)) out.push(sub);
      } catch {
        /* a corrupt or foreign blob is skipped, never fatal */
      }
    })
  );
  return out.sort((a, b) => (a.endpoint < b.endpoint ? -1 : 1));
}

export function isSubscription(v: unknown): v is PushSubscriptionJSON {
  if (!v || typeof v !== "object") return false;
  const o = v as PushSubscriptionJSON;
  return typeof o.endpoint === "string" && /^https:\/\//.test(o.endpoint) && !!o.keys && typeof o.keys.p256dh === "string" && typeof o.keys.auth === "string";
}
