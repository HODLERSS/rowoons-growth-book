"use client";

import type { Session } from "@supabase/supabase-js";
import { KEYS, onWrite, readKey, writeKey, jsonOr } from "./store";
import { mergeKey, SYNC_KEYS, type SyncKey } from "./sync-merge";
import { supabase } from "./supabase";

/**
 * Account sync. Guests never touch this: the device store is the whole app. When a session exists, every
 * synced key is mirrored to `user_data` (one row per key, RLS-scoped to the user):
 *  - on sign-in and on every return to the app, pull the account copy and merge it into the device store;
 *  - after any local write, push that key (debounced);
 *  - on sign-out, keep the device copy (it is the parent's own data) and stop mirroring.
 * The device store stays the single source the UI reads, so screens are unaware of sync.
 */
const STORAGE_TO_KEY: Record<string, SyncKey> = { [KEYS.profile]: "profile", [KEYS.milestones]: "milestones", [KEYS.memos]: "memos", [KEYS.settings]: "settings", [KEYS.acks]: "acks", [KEYS.language]: "language" };
const KEY_TO_STORAGE: Record<SyncKey, string> = { profile: KEYS.profile, milestones: KEYS.milestones, memos: KEYS.memos, settings: KEYS.settings, acks: KEYS.acks, language: KEYS.language };
const raw = jsonOr<unknown>(null);

type Listener = () => void;
const statusListeners = new Set<Listener>();
let userId: string | null = null;
let lastPullAt = 0;
let lastError: string | null = null;
const pending = new Set<SyncKey>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

export type SyncStatus = { userId: string | null; lastPullAt: number; lastError: string | null };
export function getSyncStatus(): SyncStatus {
  return { userId, lastPullAt, lastError };
}
export function subscribeSyncStatus(l: Listener): () => void {
  statusListeners.add(l);
  return () => statusListeners.delete(l);
}
function notify() {
  statusListeners.forEach((l) => l());
}

function localValue(key: SyncKey): unknown {
  return readKey(KEY_TO_STORAGE[key], raw);
}

/** Pull the account copy and merge it in. Returns the keys that changed locally. */
export async function pull(): Promise<SyncKey[]> {
  const sb = supabase();
  if (!sb || !userId) return [];
  const { data, error } = await sb.from("user_data").select("key, value").eq("user_id", userId);
  if (error) {
    lastError = error.message;
    notify();
    return [];
  }
  const remote = new Map<string, unknown>((data ?? []).map((r) => [r.key as string, r.value]));
  const changedLocally: SyncKey[] = [];
  for (const key of SYNC_KEYS) {
    const local = localValue(key);
    const merged = mergeKey(key, local, remote.has(key) ? remote.get(key) : null);
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      writeKey(KEY_TO_STORAGE[key], merged, { fromSync: true });
      changedLocally.push(key);
    }
    if (merged !== null && JSON.stringify(merged) !== JSON.stringify(remote.get(key) ?? null)) pending.add(key);
  }
  lastPullAt = Date.now();
  lastError = null;
  notify();
  if (pending.size) schedulePush(0);
  return changedLocally;
}

async function push(): Promise<void> {
  const sb = supabase();
  if (!sb || !userId || pending.size === 0) return;
  const keys = Array.from(pending);
  pending.clear();
  const rows = keys.map((key) => ({ user_id: userId, key, value: localValue(key) })).filter((r) => r.value !== null && r.value !== undefined);
  const gone = keys.filter((key) => localValue(key) === null || localValue(key) === undefined);
  if (rows.length) {
    const { error } = await sb.from("user_data").upsert(rows, { onConflict: "user_id,key" });
    if (error) {
      keys.forEach((k) => pending.add(k));
      lastError = error.message;
      notify();
      schedulePush(15_000);
      return;
    }
  }
  if (gone.length) await sb.from("user_data").delete().eq("user_id", userId).in("key", gone);
  lastError = null;
  notify();
}

function schedulePush(delay: number) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, delay);
}

function onSession(session: Session | null) {
  const next = session?.user?.id ?? null;
  if (next === userId) return;
  userId = next;
  pending.clear();
  notify();
  if (userId) void pull();
}

/** Wire the sync layer once per page load. Safe to call when accounts are disabled. */
export function startSync(): () => void {
  const sb = supabase();
  if (!sb || started) return () => {};
  started = true;
  void sb.auth.getSession().then(({ data }) => onSession(data.session));
  const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => onSession(session));
  const offWrite = onWrite((storageKey, _value, opts) => {
    const key = STORAGE_TO_KEY[storageKey];
    if (!key || opts.fromSync || !userId) return;
    pending.add(key);
    schedulePush(400);
  });
  const onVisible = () => {
    if (document.visibilityState === "visible" && userId && Date.now() - lastPullAt > 30_000) void pull();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  window.addEventListener("online", () => schedulePush(0));
  return () => {
    authSub.subscription.unsubscribe();
    offWrite();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    started = false;
  };
}

/** Flush before something irreversible (sign-out, account deletion). */
export async function flushSync(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await push();
}
