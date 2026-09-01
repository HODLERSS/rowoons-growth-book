"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed external store.
 * - Snapshots are cached per key by raw string, so `useSyncExternalStore` gets a stable reference.
 * - Writes notify subscribers in this tab; the `storage` event syncs other tabs.
 * - SSR/hydration safe: the server snapshot is whatever the caller passes.
 */

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

const LEGACY_KEYS: Record<string, string[]> = {
  "dodam:profile": ["baby-profile"],
  "dodam:memos": ["growth-memos", "rowoon-memos"],
  "dodam:milestones": ["growth-milestones", "rowoon-milestones"],
  "dodam:language": ["language"],
};

let migrated = false;
function migrateLegacy() {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  try {
    for (const [key, olds] of Object.entries(LEGACY_KEYS)) {
      if (localStorage.getItem(key) !== null) continue;
      for (const old of olds) {
        const raw = localStorage.getItem(old);
        if (raw !== null) {
          // Old keys stored language as a bare string; everything else as JSON.
          localStorage.setItem(key, key === "dodam:language" && !raw.startsWith('"') ? JSON.stringify(raw) : raw);
          break;
        }
      }
    }
  } catch {
    /* storage unavailable */
  }
}

export function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacy();
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readKey<T>(key: string, parse: (raw: string | null) => T): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = parse(raw);
  cache.set(key, { raw, value });
  return value;
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

export function writeKey(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: state still updates in memory via cache below */
    cache.set(key, { raw: JSON.stringify(value), value });
  }
  emit(key);
}

export function subscribeKey(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set!.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Read a JSON value from localStorage reactively. `serverValue` is used during SSR and hydration. */
export function useStoredValue<T>(key: string, parse: (raw: string | null) => T, serverValue: T): T {
  return useSyncExternalStore(
    (cb) => subscribeKey(key, cb),
    () => readKey(key, parse),
    () => serverValue
  );
}

/** JSON parser with a fallback for missing or corrupt data. */
export function jsonOr<T>(fallback: T, validate?: (v: unknown) => v is T) {
  return (raw: string | null): T => {
    if (raw === null) return fallback;
    try {
      const v = JSON.parse(raw);
      if (validate && !validate(v)) return fallback;
      return v as T;
    } catch {
      return fallback;
    }
  };
}

/** A ticking "now" store (for age displays). Re-renders once a minute and on tab focus. */
const nowListeners = new Set<Listener>();
let nowValue = Date.now();
let nowTimer: ReturnType<typeof setInterval> | null = null;
function tick() {
  nowValue = Date.now();
  nowListeners.forEach((l) => l());
}
export function useNow(): number {
  return useSyncExternalStore(
    (cb) => {
      nowListeners.add(cb);
      if (!nowTimer) {
        nowTimer = setInterval(tick, 60_000);
        window.addEventListener("focus", tick);
        document.addEventListener("visibilitychange", tick);
      }
      return () => {
        nowListeners.delete(cb);
        if (nowListeners.size === 0 && nowTimer) {
          clearInterval(nowTimer);
          nowTimer = null;
          window.removeEventListener("focus", tick);
          document.removeEventListener("visibilitychange", tick);
        }
      };
    },
    () => nowValue,
    () => 0
  );
}

/** True once mounted on the client (false during SSR + hydration). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export const KEYS = {
  profile: "dodam:profile",
  memos: "dodam:memos",
  milestones: "dodam:milestones",
  language: "dodam:language",
  settings: "dodam:settings",
} as const;
