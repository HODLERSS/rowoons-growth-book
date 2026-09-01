"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";
import { useLanguage } from "@/hooks/use-language";
import { useSettings } from "@/hooks/use-settings";
import { isNative, isStandalonePWA } from "@/lib/platform";

/** One-time prompt for web push on phones / installed PWA. Native reminders live in Settings. */
export function NotifyCard() {
  const { settings, update } = useSettings();
  if (isNative() || settings.notifyDismissed) return null;
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  if (!narrow && !isStandalonePWA()) return null;
  return <Inner onDismiss={() => update({ notifyDismissed: true })} />;
}

function Inner({ onDismiss }: { onDismiss: () => void }) {
  const { permission, subscribed, busy, error, subscribe } = usePush();
  const { t } = useLanguage();
  if (permission === "unsupported" || permission === "denied" || subscribed) return null;
  return (
    <section aria-labelledby="notify-card" className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="notify-card" className="text-[0.9375rem] font-semibold">
            {t("notify.title")}
          </h2>
          <p className="text-[0.8125rem] text-muted-foreground">{t("notify.desc")}</p>
          {error && (
            <p role="alert" className="mt-1 text-[0.8125rem] text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDismiss}>
          {t("notify.later")}
        </Button>
        <Button type="button" size="lg" onClick={subscribe} disabled={busy}>
          {busy ? t("notify.working") : t("notify.enable")}
        </Button>
      </div>
    </section>
  );
}
