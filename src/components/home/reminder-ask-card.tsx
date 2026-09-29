"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBaby, displayName } from "@/hooks/use-baby";
import { useLanguage } from "@/hooks/use-language";
import { useSettings } from "@/hooks/use-settings";
import { upcomingMonthiversaries } from "@/lib/age-calculator";
import { isNative } from "@/lib/platform";
import { acceptReminders, shouldAskReminders, DISMISS_PATCH, type AskOutcome, type AskStatus } from "@/lib/reminder-ask";

/** True while the native reminder offer is on Home (the account invite yields to it, keeping Home within its element budget). */
export function useReminderAsk() {
  const { baby, hasBaby } = useBaby();
  const { settings } = useSettings();
  const [status, setStatus] = useState<AskStatus | null>(null);
  const native = isNative();
  useEffect(() => {
    if (!native) return;
    // Loaded on demand so the web bundle never carries the notification planner.
    import("@/lib/reminders").then((m) => m.reminderStatus()).then(setStatus, () => setStatus("unsupported"));
  }, [native]);
  const nextMonth = baby ? (upcomingMonthiversaries(baby.birthDate)[0]?.month ?? null) : null;
  return { show: shouldAskReminders({ native, hasBaby, nextMonth, settings, status }), nextMonth };
}

/** Native soft ask: says what reminders are before iOS shows its one-time permission prompt. */
export function ReminderAskCard({ show, nextMonth }: ReturnType<typeof useReminderAsk>) {
  const { baby } = useBaby();
  const { lang, t } = useLanguage();
  const { update } = useSettings();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<AskOutcome | null>(null);

  async function accept() {
    if (!baby) return;
    setBusy(true);
    try {
      const { scheduleReminders, reminderStatus } = await import("@/lib/reminders");
      const res = await acceptReminders({ schedule: () => scheduleReminders(baby, lang), status: reminderStatus });
      setOutcome(res.outcome);
      update(res.patch);
    } finally {
      setBusy(false);
    }
  }

  // Refused at the iOS prompt: say where to turn it back on, once, then the card is gone for good.
  if (outcome === "denied")
    return (
      <Card title={t("remind_ask.denied_title")} desc={t("settings.reminders_denied")}>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOutcome("off")}>
          {t("common.ok")}
        </Button>
      </Card>
    );
  if (!show || nextMonth === null) return null;
  const name = displayName(baby, lang);
  return (
    <Card title={t(nextMonth === 1 ? "remind_ask.title_one" : "remind_ask.title", { name, month: nextMonth })} desc={t("remind_ask.desc")}>
      <Button type="button" variant="ghost" size="lg" onClick={() => update(DISMISS_PATCH)} disabled={busy}>
        {t("notify.later")}
      </Button>
      <Button type="button" size="lg" onClick={accept} disabled={busy}>
        {busy ? t("notify.working") : t("remind_ask.enable")}
      </Button>
    </Card>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="reminder-ask" className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="reminder-ask" className="text-[0.9375rem] font-semibold">
            {title}
          </h2>
          <p role="status" className="text-[0.8125rem] text-muted-foreground">
            {desc}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">{children}</div>
    </section>
  );
}
