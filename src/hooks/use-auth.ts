"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountsEnabled, apiBase, authRedirectTo, supabase } from "@/lib/supabase";
import { flushSync } from "@/lib/sync";
import { isNative } from "@/lib/platform";
import { clearAllData } from "@/lib/backup";

/** Session state shared by every component; filled by the Supabase client's auth events. */
let session: Session | null = null;
let ready = false;
const listeners = new Set<() => void>();
let wired = false;
let primed = false;
/** Before the Supabase client confirms, trust the stored session so the first client render is already right (no layout swap). */
function primeFromStorage() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    const raw = localStorage.getItem("sprout-auth");
    const stored = raw ? (JSON.parse(raw) as Session) : null;
    session = stored && stored.access_token && stored.user ? stored : null;
  } catch {
    session = null;
  }
  ready = true;
}
function set(next: Session | null) {
  session = next;
  ready = true;
  listeners.forEach((l) => l());
}
function wire() {
  if (wired) return;
  wired = true;
  const sb = supabase();
  if (!sb) {
    ready = true;
    return;
  }
  void sb.auth.getSession().then(({ data }) => set(data.session));
  sb.auth.onAuthStateChange((_e, s) => set(s));
}
const snapshot = () => {
  primeFromStorage();
  return { session, ready };
};
const serverSnapshot = { session: null as Session | null, ready: false };
let cached = snapshot();
function getSnapshot() {
  const s = snapshot();
  if (s.session !== cached.session || s.ready !== cached.ready) cached = s;
  return cached;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export function useAuth() {
  useEffect(wire, []);
  const state = useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getSnapshot, () => serverSnapshot);
  const user = state.session?.user ?? null;

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const sb = supabase();
    if (!sb) return { ok: false, error: "accounts unavailable" };
    const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authRedirectTo(), skipBrowserRedirect: isNative(), queryParams: { prompt: "select_account" } } });
    if (error) return { ok: false, error: error.message };
    if (isNative() && data.url) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url, presentationStyle: "popover" });
    }
    return { ok: true };
  }, []);

  /** Sign in with Apple: native ASAuthorization via the community plugin, the OAuth flow on the web. */
  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    const sb = supabase();
    if (!sb) return { ok: false, error: "accounts unavailable" };
    if (isNative()) {
      try {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        const nonce = crypto.randomUUID();
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
        const hashed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
        const { response } = await SignInWithApple.authorize({ clientId: "co.minjae.sprout", redirectURI: authRedirectTo(), scopes: "email name", nonce: hashed });
        if (!response.identityToken) return { ok: false, error: "no identity token" };
        const { error } = await sb.auth.signInWithIdToken({ provider: "apple", token: response.identityToken, nonce });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
    const { error } = await sb.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: authRedirectTo() } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  /**
   * Email and password. Sprout gates nothing behind an account, so this exists alongside the other
   * providers rather than in front of them: it gives anyone who prefers a password one, and it gives
   * App Review a demo account they can sign into without a mailbox or an Apple ID.
   */
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const sb = supabase();
    if (!sb) return { ok: false, error: "accounts unavailable" };
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const sb = supabase();
    if (!sb) return { ok: false, error: "accounts unavailable" };
    const { error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirectTo() } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signInWithEmail = useCallback(async (email: string): Promise<AuthResult> => {
    const sb = supabase();
    if (!sb) return { ok: false, error: "accounts unavailable" };
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: authRedirectTo(), shouldCreateUser: true } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const sb = supabase();
    if (!sb) return;
    await flushSync();
    await sb.auth.signOut();
  }, []);

  /** Deletes the account and everything stored under it (server, service role), then clears this device. */
  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    const sb = supabase();
    const token = state.session?.access_token;
    if (!sb || !token) return { ok: false, error: "not signed in" };
    const res = await fetch(`${apiBase()}/api/account/delete/`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` };
    await sb.auth.signOut();
    clearAllData();
    // The records are gone, so the reminders scheduled from them must go too: otherwise the phone
    // keeps announcing a child the app no longer knows. Loaded on demand, like every other caller,
    // so the notifications code stays out of the first-load bundle.
    if (isNative()) await import("@/lib/reminders").then((m) => m.cancelReminders());
    return { ok: true };
  }, [state.session]);

  return useMemo(
    () => ({ enabled: accountsEnabled(), ready: state.ready, user, email: user?.email ?? null, signInWithGoogle, signInWithApple, signInWithEmail, signInWithPassword, signUpWithPassword, signOut, deleteAccount }),
    [state.ready, user, signInWithGoogle, signInWithApple, signInWithEmail, signInWithPassword, signUpWithPassword, signOut, deleteAccount]
  );
}

/** Native only: the sprout:// callback carries the PKCE code; exchange it and close the system browser. */
export async function handleNativeAuthUrl(url: string): Promise<boolean> {
  if (!url.startsWith("sprout://auth/callback")) return false;
  const sb = supabase();
  if (!sb) return false;
  const code = new URL(url.replace("sprout://", "https://sprout.local/")).searchParams.get("code");
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close().catch(() => {});
  } catch {
    /* no browser plugin */
  }
  if (!code) return false;
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return !error;
}
