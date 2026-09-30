// POST /api/admin: the admin site's only server endpoint (a Vercel Node function, bundled by scripts/build-output.mjs).
// Same origin as the page, so no CORS is offered at all; a browser request from any other origin is refused.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { adminOrigins, handleAdmin, originOk, type WebSub } from "./core";
import { http2Transport } from "./apns";
import { supabaseStore, verifyActor } from "./store";

const MAX_BODY = 16 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };
  const origin = (req.headers.origin as string | undefined) ?? null;
  if (!originOk(origin, adminOrigins(process.env.ADMIN_ORIGINS))) return send(403, { ok: false, error: "origin not allowed" });
  if (req.method !== "POST") return send(405, { ok: false, error: "POST only" });
  let input: Record<string, unknown> = {};
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    input = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return send(400, { ok: false, error: "Bad request body." });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(503, { ok: false, error: "The admin API is not configured." });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const vapid = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
    ? { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
    : null;
  const jwt = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  try {
    const r = await handleAdmin(
      {
        store: supabaseStore(db),
        env: (k) => process.env[k],
        verify: (t) => verifyActor(db, t),
        webPush: async (sub: WebSub, payload: string) => {
          if (!vapid) return { status: 0, error: "VAPID keys not configured" };
          try {
            const r = await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { vapidDetails: vapid, TTL: 86_400, timeout: 10_000 });
            return { status: r.statusCode };
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode ?? 0;
            return { status, error: e instanceof Error ? e.message : String(e) };
          }
        },
        apns: () => http2Transport(),
      },
      jwt,
      input,
    );
    return send(r.status, r.body);
  } catch (e) {
    console.error("admin api", e instanceof Error ? e.message : String(e));
    return send(500, { ok: false, error: "Something went wrong. Check History before retrying." });
  }
}
