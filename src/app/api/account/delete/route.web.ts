import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * The iOS app is served from a custom scheme (Sprout://localhost), so its call here is cross-origin
 * and the Authorization header makes the browser send a preflight first. Without these headers WebKit
 * blocks the POST and deletion silently never happens on device — the web app never saw it because it
 * calls this route same-origin. Any scheme on localhost is a Capacitor web view, never a real site;
 * the bearer token remains the actual authorisation, and it only ever deletes its own user.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !/^[a-z][a-z0-9+.-]*:\/\/localhost(?::\d+)?$/i.test(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

/**
 * Deletes the caller's account: verifies the bearer token, then removes the auth user with the service role.
 * user_data and push_subscriptions cascade from auth.users. App Store guideline 5.1.1(v) requires this.
 */
export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "Accounts not configured" }, { status: 503, headers: cors });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
  if (delErr) {
    console.error("Account delete error:", delErr);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500, headers: cors });
  }
  return NextResponse.json({ ok: true }, { headers: cors });
}
