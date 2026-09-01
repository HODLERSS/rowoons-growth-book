"use client";

import { useCallback, useEffect, useState } from "react";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer as ArrayBuffer;
}

async function ensureServiceWorker(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  if (registration.active) return registration;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Service worker did not activate")), timeoutMs);
    const sw = registration.installing || registration.waiting;
    sw?.addEventListener("statechange", () => {
      if (sw.state === "activated") {
        clearTimeout(timer);
        resolve(registration);
      }
    });
    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    });
  });
}

function detect(): PushPermission {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermission;
}

/** Web push subscription state (web only; the native app uses local reminders instead). */
export function usePush() {
  const [permission, setPermission] = useState<PushPermission>(detect);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (permission === "unsupported") return;
    let cancelled = false;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(!!sub);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [permission]);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== "granted") return;
      const registration = await ensureServiceWorker();
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("Missing VAPID key");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys) throw new Error("Incomplete subscription");
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => {});
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return { permission, subscribed, busy, error, subscribe, unsubscribe };
}
