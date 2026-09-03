import { del, list, put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { open, seal } from "./push-crypto";

/**
 * Web push subscriber list in a Vercel Blob store, as AES-256-GCM ciphertext (push-crypto.ts; without
 * PUSH_STORE_SECRET the file is noise, so the store may be public-read).
 *
 * Every write creates a NEW file (`push/subscriptions/<zero-padded ms>-<rand>.v1`) and the newest file wins.
 * Overwriting one pathname is not an option: Vercel's CDN serves an overwritten blob stale for up to a minute
 * and a read-modify-write on a stale read silently drops subscriptions. `list()` is served by the API, not
 * the CDN, and a fresh pathname is never cached. Older versions are pruned after each write (a few kept).
 * The list is tiny (a few phones); concurrent writes are last-writer-wins, and the client re-registers its
 * subscription on every load, which repairs any lost entry. Server routes only.
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PREFIX = "push/subscriptions/";
const KEEP = 3;

function secret(): string {
  const s = process.env.PUSH_STORE_SECRET;
  if (!s) throw new Error("PUSH_STORE_SECRET is not set");
  return s;
}

async function versions() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  // Pathnames sort chronologically (zero-padded epoch millis first).
  return blobs.filter((b) => b.pathname.endsWith(".v1")).sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
}

export async function readSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const [newest] = await versions();
  if (!newest) return [];
  const res = await fetch(newest.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`push store read failed: ${res.status}`);
  const text = await res.text();
  if (!text) return [];
  const parsed = open<PushSubscriptionJSON[]>(text, secret());
  return Array.isArray(parsed) ? parsed : [];
}

export async function writeSubscriptions(next: PushSubscriptionJSON[]): Promise<void> {
  const name = `${PREFIX}${String(Date.now()).padStart(14, "0")}-${randomBytes(3).toString("hex")}.v1`;
  await put(name, seal(next, secret()), { access: "public", addRandomSuffix: false, contentType: "text/plain" });
  const all = await versions();
  const stale = all.filter((b) => b.pathname !== name).slice(KEEP - 1);
  if (stale.length) await del(stale.map((b) => b.url)).catch(() => {});
}

export function isSubscription(v: unknown): v is PushSubscriptionJSON {
  if (!v || typeof v !== "object") return false;
  const o = v as PushSubscriptionJSON;
  return typeof o.endpoint === "string" && /^https:\/\//.test(o.endpoint) && !!o.keys && typeof o.keys.p256dh === "string" && typeof o.keys.auth === "string";
}
