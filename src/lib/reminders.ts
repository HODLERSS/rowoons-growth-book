"use client";

import { isNative } from "./platform";
import { upcomingMonthiversaries } from "./age-calculator";
import { translate, type Language } from "@/i18n";

const ID_BASE = 1000;
const HOUR = 9;

export type ReminderStatus = "unsupported" | "prompt" | "granted" | "denied";

export async function reminderStatus(): Promise<ReminderStatus> {
  if (!isNative()) return "unsupported";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const { display } = await LocalNotifications.checkPermissions();
    if (display === "granted") return "granted";
    if (display === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

/** Schedule one local notification per upcoming monthiversary (native only). Returns the count scheduled. */
export async function scheduleReminders(name: string, birthDate: string, lang: Language): Promise<number> {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return 0;
  await cancelReminders();
  const dates = upcomingMonthiversaries(birthDate);
  const notifications = dates.map(({ month, date }) => ({
    id: ID_BASE + month,
    title: translate(lang, "reminder.title", { name, month }),
    body: translate(lang, "reminder.body"),
    schedule: { at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), HOUR, 0, 0), allowWhileIdle: true },
    extra: { url: `/milestones/${month}/` },
  }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return notifications.length;
}

export async function cancelReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 100);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch {
    /* ignore */
  }
}
