"use client";

import { Bell, BellOff, BellRing, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationBanner() {
  const { permission, isSubscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

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
              Retry
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
            <p className="text-sm font-medium">Notifications blocked</p>
            <p className="text-xs text-muted-foreground">
              Enable in your browser settings to receive updates
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
              Notifications enabled
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={unsubscribe}
            disabled={loading}
          >
            Turn off
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
          <p className="text-sm font-medium">Get milestone reminders</p>
          <p className="text-xs text-muted-foreground">
            Stay updated on Rowoon&apos;s growth
          </p>
        </div>
        <Button
          size="sm"
          onClick={subscribe}
          disabled={loading}
        >
          {loading ? "..." : "Enable"}
        </Button>
      </CardContent>
    </Card>
  );
}
