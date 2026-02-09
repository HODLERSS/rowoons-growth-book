"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useLanguage } from "@/contexts/language-context";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isNarrow = window.matchMedia("(max-width: 768px)").matches;
      setIsMobile(isStandalone || isNarrow);
    };
    check();
    const mq = window.matchMedia("(max-width: 768px)");
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);
  return isMobile;
}

export function NotificationBanner() {
  const { permission, isSubscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  if (!isMobile) return null;
  if (permission === "unsupported" && !error) return null;

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="flex items-center gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {error}
            </p>
          </div>
          {permission !== "unsupported" && permission !== "denied" && (
            <Button
              size="sm"
              variant="outline"
              onClick={subscribe}
              disabled={loading}
            >
              {t("notify.retry")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3">
          <BellOff className="size-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t("notify.blocked")}</p>
            <p className="text-xs text-muted-foreground">
              {t("notify.blocked_desc")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubscribed) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CardContent className="flex items-center gap-3">
          <BellRing className="size-5 text-green-600 dark:text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {t("notify.enabled")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={unsubscribe}
            disabled={loading}
          >
            {t("notify.off")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <Bell className="size-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t("notify.get_reminders")}</p>
          <p className="text-xs text-muted-foreground">
            {t("notify.stay_updated")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={subscribe}
          disabled={loading}
        >
          {loading ? "..." : t("notify.enable")}
        </Button>
      </CardContent>
    </Card>
  );
}
