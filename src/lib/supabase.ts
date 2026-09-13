"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isNative } from "./platform";

/**
 * Browser Supabase client (anon key + the user's session). Null when the app runs without account support
 * (missing env) or during SSR. Sessions persist in localStorage under "sprout-auth". The PKCE flow works for
 * the web (code in the callback URL) and for the native app (code arrives via the sprout:// URL scheme and is
 * exchanged by hand, so URL detection is off there).
 */
let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || typeof window === "undefined") return (client = null);
  client = createClient(url, key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isNative(), storageKey: "sprout-auth" },
  });
  return client;
}

export function accountsEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Server routes live on the website; the native app calls them there. */
export function apiBase(): string {
  return isNative() ? (process.env.NEXT_PUBLIC_API_BASE ?? "https://baby.minjae.co") : "";
}

/** Where OAuth and magic links return to. */
export function authRedirectTo(): string {
  return isNative() ? "sprout://auth/callback" : `${window.location.origin}/auth/callback/`;
}
