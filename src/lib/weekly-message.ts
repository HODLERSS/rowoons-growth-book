import { getMonthContent } from "./content-loader";
import { correctedAge } from "./corrected-age";
import { monthForAge } from "./age-calculator";
import { localParts, weekIndex } from "./weekly-window";
import { pickWeeklyItem } from "./weekly-plan";
import { translate, type Language } from "@/i18n";

/** The profile snapshot a web subscription or an iOS device carries (server side, no account needed). */
export interface WeeklyProfile {
  lang: string;
  tz: string;
  name: string | null;
  birth_date: string | null;
  due_date: string | null;
}

/**
 * The note one subscriber would get this week, or null when there is nothing to say. Pure (content is bundled), so
 * the weekly job and the admin tool's preview/send produce the same words. `month` is the book month it drew from.
 */
export function weeklyMessage(sub: WeeklyProfile, now: Date): { title: string; body: string; url: string; month: number } | null {
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
  return { title: translate(lang, "reminder.weekly_title", { name, month }), body, url: item.url, month };
}
