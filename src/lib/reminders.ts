"use client";

import { isNative } from "./platform";
import { upcomingMonthiversaries } from "./age-calculator";
import { correctedAge } from "./corrected-age";
import { monthForAge } from "./age-calculator";
import { loadMonth } from "./month-content";
import { KEYS, readKey, jsonOr } from "./store";
import { nextSundays, pickWeeklyItem } from "./weekly-plan";
import { translate, type Language } from "@/i18n";
import type { BabyInfo, MilestoneCompletion } from "./types";

const MONTHLY_BASE = 1000; // + month
const WEEKLY_BASE = 2000; // + week index
const ID_MAX = 3000;
const MONTHLY_HOUR = 9;
/** iOS keeps at most 64 pending local notifications per app; 12 monthly + 8 weekly stays well inside. */
const MONTHLY_AHEAD = 12;
export const WEEKLY_AHEAD = 8;

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

function displayNameFor(baby: BabyInfo, lang: Language): string {
  const ko = baby.nameKo?.trim();
  return lang === "ko" && ko ? ko : baby.name;
}

/**
 * Schedule everything (native only): one note per upcoming monthiversary and one Sunday-morning note
 * per week that rotates play tip → safety → open milestones. Re-run on every launch so the weekly
 * notes follow the baby's month and what the parent has confirmed or acknowledged. Returns the count.
 */
export async function scheduleReminders(baby: BabyInfo, lang: Language, from: Date | number = Date.now()): Promise<number> {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return 0;
  await cancelReminders();
  const name = displayNameFor(baby, lang);

  const monthly = upcomingMonthiversaries(baby.birthDate, from)
    .slice(0, MONTHLY_AHEAD)
    .map(({ month, date }) => ({
      id: MONTHLY_BASE + month,
      title: translate(lang, "reminder.title", { name, month }),
      body: translate(lang, "reminder.body"),
      schedule: { at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), MONTHLY_HOUR, 0, 0), allowWhileIdle: true },
      extra: { url: `/milestones/${month}/` },
    }));

  const weekly = await weeklyNotifications(baby, lang, name, from);
  const notifications = [...monthly, ...weekly];
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return notifications.length;
}

async function weeklyNotifications(baby: BabyInfo, lang: Language, name: string, from: Date | number) {
  const done = new Set(
    Object.entries(readKey(KEYS.milestones, jsonOr<MilestoneCompletion>({})))
      .filter(([, v]) => v?.completed)
      .map(([k]) => k)
  );
  const acks = new Set(readKey(KEYS.acks, jsonOr<string[]>([])));
  const out = [];
  const dates = nextSundays(from, WEEKLY_AHEAD);
  for (let i = 0; i < dates.length; i++) {
    const at = dates[i];
    const month = monthForAge(correctedAge(baby.birthDate, baby.dueDate, at).age);
    const content = await loadMonth(lang, month);
    const item = pickWeeklyItem(i, content, { doneIds: done, ackIds: acks });
    if (!item) continue;
    const body =
      item.kind === "tip"
        ? translate(lang, "reminder.weekly_tip", { title: item.title })
        : item.kind === "watchout"
          ? translate(lang, "reminder.weekly_watchout", { title: item.title })
          : translate(lang, "reminder.weekly_milestones", { titles: item.titles.join(lang === "ko" ? ", " : ", ") });
    out.push({
      id: WEEKLY_BASE + i,
      title: translate(lang, "reminder.weekly_title", { name, month }),
      body,
      schedule: { at, allowWhileIdle: true },
      extra: { url: item.url },
    });
  }
  return out;
}

export async function cancelReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= MONTHLY_BASE && n.id < ID_MAX);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch {
    /* ignore */
  }
}
