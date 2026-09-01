/**
 * Server-side / test access to the full content set. Never import this from a client component:
 * it pulls every month in both languages into the bundle. Clients use lib/month-content.ts.
 */
import type { Milestone, MilestoneCategory, MonthlyNote, PlayTip, WatchOut } from "./types";
import type { Language } from "@/i18n";
import type { MonthBundle, MonthContent } from "./month-content";
import { CATEGORY_ORDER, SEVERITY_ORDER } from "./constants";

import milestonesEn from "@/content/milestones.json";
import playTipsEn from "@/content/play-tips.json";
import watchOutsEn from "@/content/watch-outs.json";
import monthlyNotesEn from "@/content/monthly-notes.json";

import milestonesKo from "@/content/ko/milestones.json";
import playTipsKo from "@/content/ko/play-tips.json";
import watchOutsKo from "@/content/ko/watch-outs.json";
import monthlyNotesKo from "@/content/ko/monthly-notes.json";

const data = {
  en: {
    milestones: milestonesEn as Milestone[],
    playTips: playTipsEn as PlayTip[],
    watchOuts: watchOutsEn as WatchOut[],
    monthlyNotes: monthlyNotesEn as Record<string, MonthlyNote>,
  },
  ko: {
    milestones: milestonesKo as Milestone[],
    playTips: playTipsKo as PlayTip[],
    watchOuts: watchOutsKo as WatchOut[],
    monthlyNotes: monthlyNotesKo as Record<string, MonthlyNote>,
  },
} satisfies Record<Language, unknown>;

export function getMilestones(month: number, lang: Language = "en"): Milestone[] {
  return data[lang].milestones.filter((m) => m.month === month);
}

export function getMilestonesByCategory(month: number, lang: Language = "en"): Record<MilestoneCategory, Milestone[]> {
  const list = getMilestones(month, lang);
  const out = { social: [], language: [], cognitive: [], physical: [] } as Record<MilestoneCategory, Milestone[]>;
  for (const cat of CATEGORY_ORDER) out[cat] = list.filter((m) => m.category === cat);
  return out;
}

export function getAllMilestones(lang: Language = "en"): Milestone[] {
  return data[lang].milestones;
}

export function getPlayTips(month: number, lang: Language = "en"): PlayTip[] {
  return data[lang].playTips.filter((t) => t.month === month);
}

/** Watch-outs sorted urgent → caution → info. */
export function getWatchOuts(month: number, lang: Language = "en"): WatchOut[] {
  return data[lang].watchOuts
    .filter((w) => w.month === month)
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function getMonthlyNote(month: number, lang: Language = "en"): MonthlyNote | null {
  return data[lang].monthlyNotes[String(month)] ?? null;
}

export function getMonthContent(month: number, lang: Language): MonthContent {
  return { month, milestones: getMilestones(month, lang), playTips: getPlayTips(month, lang), watchOuts: getWatchOuts(month, lang), note: getMonthlyNote(month, lang) };
}

/** Both languages for one month — passed from static pages to their client screens. */
export function getMonthBundle(month: number): MonthBundle {
  return { en: getMonthContent(month, "en"), ko: getMonthContent(month, "ko") };
}
