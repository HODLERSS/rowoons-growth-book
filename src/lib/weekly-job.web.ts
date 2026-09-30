import webpush from "web-push";
import { isWeeklySlot, dueForWeekly } from "./weekly-window";
import { weeklyMessage } from "./weekly-message";
import { markWeeklySent, readSubscriptions, removeSubscription } from "./push-store.web";

export interface WeeklyRunResult {
  checked: number;
  due: number;
  sent: number;
  failed: number;
  expired: number;
  skipped: { noProfile: number; notSlot: number; recentlySent: number; disabled: number };
}

/**
 * Runs hourly (GitHub Actions). For each subscriber whose local clock is Sunday 09:xx and who has not been
 * sent a weekly note in the last six days, send one. Sending a note now, to one profile, is the admin tool's job
 * (admin/, "Weekly note"), not this route's.
 */
export async function runWeekly(now: Date): Promise<WeeklyRunResult> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const all = await readSubscriptions();
  const result: WeeklyRunResult = { checked: all.length, due: 0, sent: 0, failed: 0, expired: 0, skipped: { noProfile: 0, notSlot: 0, recentlySent: 0, disabled: 0 } };
  const sentTo: string[] = [];
  await Promise.all(
    all.map(async (sub) => {
      if (!sub.weekly_enabled) return void result.skipped.disabled++;
      if (!isWeeklySlot(now, sub.tz)) return void result.skipped.notSlot++;
      if (!dueForWeekly(sub.last_weekly_at, now)) return void result.skipped.recentlySent++;
      const note = weeklyMessage(sub, now);
      if (!note) return void result.skipped.noProfile++;
      const msg = { title: note.title, body: note.body, url: note.url };
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
