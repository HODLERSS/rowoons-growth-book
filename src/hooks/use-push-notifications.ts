"use client";

import { useState, useCallback, useEffect } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function waitForServiceWorker(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  return new Promise((resolve) => {
    // If already active, resolve immediately
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.active) {
        resolve(reg);
        return;
      }
      // Otherwise wait for ready with a timeout
      const timer = setTimeout(() => resolve(null), timeoutMs);
      navigator.serviceWorker.ready.then((r) => {
        clearTimeout(timer);
        resolve(r);
      });
    });
  });
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      setLoading(false);
      return;
    }

    setPermission(Notification.permission as PermissionState);

    waitForServiceWorker().then((registration) => {
      if (registration) {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      } else {
        // SW not ready yet, but still allow the button to work -
        // subscribe() will trigger SW ready on its own
        setLoading(false);
      }
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (permission === "unsupported") return;
    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== "granted") {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscription failed:", err);
    } finally {
      setLoading(false);
    }
  }, [permission]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}
