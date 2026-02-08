import { Milestone, PlayTip, WatchOut, MonthlyNote } from "./types";
import type { Language } from "@/contexts/language-context";

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
};

export function getMilestones(month: number, lang: Language = "en"): Milestone[] {
  return data[lang].milestones.filter((m) => m.month === month);
}

export function getMilestonesByCategory(month: number, lang: Language = "en") {
  const milestones = getMilestones(month, lang);
  return {
    social: milestones.filter((m) => m.category === "social"),
    language: milestones.filter((m) => m.category === "language"),
    cognitive: milestones.filter((m) => m.category === "cognitive"),
    physical: milestones.filter((m) => m.category === "physical"),
  };
}

export function getAllMilestones(lang: Language = "en"): Milestone[] {
  return data[lang].milestones;
}

export function getPlayTips(month: number, lang: Language = "en"): PlayTip[] {
  return data[lang].playTips.filter((t) => t.month === month);
}

export function getWatchOuts(month: number, lang: Language = "en"): WatchOut[] {
  return data[lang].watchOuts.filter((w) => w.month === month);
}

export function getMonthlyNote(month: number, lang: Language = "en"): MonthlyNote | null {
  return data[lang].monthlyNotes[String(month)] ?? null;
}

export function getAvailableMonths(
  type: "milestones" | "play-tips" | "watch-outs"
): number[] {
  const src =
    type === "milestones"
      ? data.en.milestones
      : type === "play-tips"
        ? data.en.playTips
        : data.en.watchOuts;
  const months = new Set(src.map((d) => d.month));
  return Array.from(months).sort((a, b) => a - b);
}
