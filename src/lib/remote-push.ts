"use client";

import { registerPlugin } from "@capacitor/core";
import { isNative } from "./platform";
import { KEYS, readKey, jsonOr } from "./store";
import { supabase } from "./supabase";
import { notificationTarget } from "./notification-target";

// Notes from Sprout: occasional remote notifications (APNs) in the iOS app, sent from the separate admin tool.
// The web has its own push (use-push.ts); everything here is a no-op outside the native app.
//
// Consent: on by default without a prompt. iOS "provisional" authorization delivers quietly to Notification Center
// and never asks. The ONE system prompt stays where it was: the Home reminders card and the Settings reminders
// switch (when the parent says yes there, notes become alerts too). This file never asks for full authorization.
//
// The device's choice (Settings > Notes from Sprout) is the "sprout-push" key, device-only (not synced): "off"
// deletes this device's token server side, which is what stops sends. Only the token, language and time zone leave
// the phone (and the account, if signed in), never anything about the baby.

export type PushAuth = "notDetermined" | "denied" | "authorized" | "provisional" | "ephemeral" | "unavailable";
type ApnsEnvironment = "production" | "sandbox";

interface SproutPushPlugin {
  status(): Promise<{ status: PushAuth }>;
  requestQuiet(): Promise<{ status: PushAuth }>;
  apnsEnvironment(): Promise<{ environment: ApnsEnvironment }>;
}
const SproutPush = registerPlugin<SproutPushPlugin>("SproutPush");

const PREF_KEY = "sprout-push"; // "on" | "off"
const TOKEN_KEY = "sprout-push-token"; // this device's APNs token, so Off removes exactly this device

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked */
  }
};

export const notesEnabled = (): boolean => read(PREF_KEY) !== "off";
export const delivers = (s: PushAuth) => s === "authorized" || s === "provisional" || s === "ephemeral";

/** The app-wide notification authorization, telling provisional (quiet) apart from alerts. */
export async function pushAuthStatus(): Promise<PushAuth> {
  if (!isNative()) return "unavailable";
  try {
    return (await SproutPush.status()).status;
  } catch {
    return "unavailable"; // a build without the native plugin
  }
}

/** Saves the token server side with the signed-in account, if any (a guest registers unowned). */
async function saveToken(token: string, environment: ApnsEnvironment): Promise<void> {
  write(TOKEN_KEY, token);
  const sb = supabase();
  if (!sb) return;
  const lang = readKey(KEYS.language, jsonOr<string | null>(null)) === "ko" ? "ko" : "en";
  const { error } = await sb.rpc("register_push_device", { p_token: token, p_environment: environment, p_lang: lang, p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (error) console.warn("push: register failed", error.message);
}

async function forgetToken(): Promise<void> {
  const token = read(TOKEN_KEY);
  write(TOKEN_KEY, null);
  if (!token) return;
  await supabase()?.rpc("unregister_push_device", { p_token: token });
}

let listening: Promise<void> | null = null;
let environment: ApnsEnvironment = "production";

/**
 * Make sure this device is registered (every launch, and after sign-in or sign-out so the token follows the
 * account). First time: quiet authorization, no prompt. Denied or switched off: the token is removed. Never throws.
 */
export async function syncRemotePush(): Promise<PushAuth> {
  if (!isNative()) return "unavailable";
  if (!notesEnabled()) return pushAuthStatus();
  try {
    let status = await pushAuthStatus();
    if (status === "unavailable") return status;
    if (status === "notDetermined") status = (await SproutPush.requestQuiet()).status;
    if (!delivers(status)) {
      await forgetToken();
      return status;
    }
    environment = (await SproutPush.apnsEnvironment()).environment;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    listening ??= (async () => {
      await PushNotifications.addListener("registration", (t) => void saveToken(t.value, environment).catch(() => {}));
      await PushNotifications.addListener("registrationError", (e) => console.warn("push: registration failed", e.error));
    })();
    await listening;
    await PushNotifications.register();
    return status;
  } catch (e) {
    console.warn("push: unavailable", e);
    return "unavailable";
  }
}

/** Settings > Notes from Sprout. */
export async function setNotesEnabled(on: boolean): Promise<PushAuth> {
  write(PREF_KEY, on ? "on" : "off");
  if (on) return syncRemotePush();
  try {
    await forgetToken();
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
  } catch {
    /* already gone */
  }
  return pushAuthStatus();
}

/**
 * A tap on a note (including the one that cold-launched the app: the plugin keeps that event until a listener is
 * attached) opens the app route it names; anything else lands on Home. Returns an unsubscribe.
 */
export function onRemotePushOpen(open: (url: string) => void): () => void {
  if (!isNative()) return () => {};
  let handle: { remove: () => Promise<void> } | undefined;
  let live = true;
  import("@capacitor/push-notifications")
    .then(({ PushNotifications }) => PushNotifications.addListener("pushNotificationActionPerformed", (a) => open(notificationTarget(a.notification?.data))))
    .then((h) => {
      if (live) handle = h;
      else void h.remove();
    })
    .catch(() => {});
  return () => {
    live = false;
    void handle?.remove();
  };
}
