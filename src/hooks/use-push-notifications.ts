"use client";

import { useState, useCallback, useEffect } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

async function ensureServiceWorker(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  if (registration.active) return registration;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SW activation timeout")), timeoutMs);

    if (registration.installing || registration.waiting) {
      const sw = registration.installing || registration.waiting;
      sw!.addEventListener("statechange", () => {
        if (sw!.state === "activated") {
          clearTimeout(timer);
          resolve(registration);
        }
      });
    }

    navigator.serviceWorker.ready.then((reg) => {
      clearTimeout(timer);
      resolve(reg);
    });
  });
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setPermission("unsupported");
      setLoading(false);
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setError("Service workers not supported");
      setLoading(false);
      return;
    }
    if (!("PushManager" in window)) {
      setPermission("unsupported");
      setError("Push not supported. Add to Home Screen first.");
      setLoading(false);
      return;
    }
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setError("Notifications not supported");
      setLoading(false);
      return;
    }

    setPermission(Notification.permission as PermissionState);

    // Check existing subscription but don't block on SW readiness
    ensureServiceWorker(3000)
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") {
        setError(result === "denied" ? "Permission denied. Check Settings." : "Permission dismissed.");
        setLoading(false);
        return;
      }

      // Step 2: Service worker
      const registration = await ensureServiceWorker();

      // Step 3: VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("App config error: missing VAPID key");
        setLoading(false);
        return;
      }

      // Step 4: Push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJSON = subscription.toJSON();
      if (!subJSON.endpoint || !subJSON.keys) {
        setError("Browser returned incomplete subscription");
        setLoading(false);
        return;
      }

      // Step 5: Send to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subJSON),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`Server error: ${data.error || res.status}`);
        setLoading(false);
        return;
      }

      setIsSubscribed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("Push subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, isSubscribed, loading, error, subscribe, unsubscribe };
}
