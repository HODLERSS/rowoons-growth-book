import webpush from "web-push";
import { getMonthContent } from "./content-loader";
import { correctedAge } from "./corrected-age";
import { monthForAge } from "./age-calculator";
import { localParts, isWeeklySlot, dueForWeekly, weekIndex } from "./weekly-window";
import { pickWeeklyItem } from "./weekly-plan";
import { markWeeklySent, readSubscriptions, removeSubscription, type SubscriberRow } from "./push-store.web";
import { translate, type Language } from "@/i18n";

export interface WeeklyRunResult {
  checked: number;
  due: number;
  sent: number;
  failed: number;
  expired: number;
  skipped: { noProfile: number; notSlot: number; recentlySent: number; disabled: number };
}

/** The note one subscriber would get this week, or null when there is nothing to say. */
export function weeklyMessage(sub: SubscriberRow, now: Date): { title: string; body: string; url: string } | null {
  if (!sub.birth_date) return null;
  const lang: Language = sub.lang === "ko" ? "ko" : "en";
  const local = localParts(now, sub.tz);
  const [y, m, d] = local.date.split("-").map(Number);
  const localMidnight = new Date(y, m - 1, d);
  const age = correctedAge(sub.birth_date, sub.due_date, localMidnight).age;
  const month = monthForAge(age);
  const content = getMonthContent(month, lang);
  const item = pickWeeklyItem(weekIndex(now), content, { doneIds: new Set(), ackIds: new Set() });
  if (!item) return null;
  const name = sub.name || (lang === "ko" ? "아기" : "your baby");
  const body =
    item.kind === "tip"
      ? translate(lang, "reminder.weekly_tip", { title: item.title })
      : item.kind === "watchout"
        ? translate(lang, "reminder.weekly_watchout", { title: item.title })
        : translate(lang, "reminder.weekly_milestones", { titles: item.titles.join(", ") });
  return { title: translate(lang, "reminder.weekly_title", { name, month }), body, url: item.url };
}

/**
 * Runs hourly (GitHub Actions). For each subscriber whose local clock is Sunday 09:xx and who has not been
 * sent a weekly note in the last six days, send one. `force` (admin "run now") ignores the clock and the
 * six-day guard, so an operator can see the real message on their own phone at any time.
 */
export async function runWeekly(now: Date, opts: { force?: boolean; onlyEndpoints?: string[] } = {}): Promise<WeeklyRunResult> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const all = await readSubscriptions();
  const result: WeeklyRunResult = { checked: all.length, due: 0, sent: 0, failed: 0, expired: 0, skipped: { noProfile: 0, notSlot: 0, recentlySent: 0, disabled: 0 } };
  const only = opts.onlyEndpoints?.length ? new Set(opts.onlyEndpoints) : null;
  const sentTo: string[] = [];
  await Promise.all(
    all.map(async (sub) => {
      if (only && !only.has(sub.endpoint)) return;
      if (!sub.weekly_enabled) return void result.skipped.disabled++;
      if (!opts.force && !isWeeklySlot(now, sub.tz)) return void result.skipped.notSlot++;
      if (!opts.force && !dueForWeekly(sub.last_weekly_at, now)) return void result.skipped.recentlySent++;
      const msg = weeklyMessage(sub, now);
      if (!msg) return void result.skipped.noProfile++;
      result.due++;
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(msg));
        result.sent++;
        sentTo.push(sub.endpoint);
      } catch (err: unknown) {
        result.failed++;
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 410 || code === 404) {
          result.expired++;
          await removeSubscription(sub.endpoint).catch(() => false);
        }
      }
    })
  );
  await markWeeklySent(sentTo, now);
  return result;
}
