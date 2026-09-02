import type { MonthContent } from "./month-content";

/** Weekly note fires Sunday mornings, local time. */
export const WEEKLY_HOUR = 9;
export const WEEKLY_DAY = 0; // Sunday

/** The next `count` Sunday mornings strictly after `from`. */
export function nextSundays(from: Date | number, count: number): Date[] {
  const start = typeof from === "number" ? new Date(from) : from;
  let candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), WEEKLY_HOUR, 0, 0, 0);
  candidate.setDate(candidate.getDate() + ((WEEKLY_DAY - candidate.getDay() + 7) % 7));
  if (candidate.getTime() <= start.getTime()) candidate = addDays(candidate, 7);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) out.push(addDays(candidate, 7 * i));
  return out;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), 0, 0, 0);
}

export type WeeklyItem =
  | { kind: "tip"; id: string; title: string; url: string }
  | { kind: "watchout"; id: string; title: string; action?: string; url: string }
  | { kind: "milestones"; id: string; titles: string[]; url: string };

const MAX_MILESTONE_TITLES = 3;

/**
 * What week `index` (0-based) should say: play tip → watch-out → open milestones, then around again
 * with the next tip / watch-out. Acknowledged watch-outs and confirmed milestones are skipped; when a
 * slot has nothing left it falls back to a play tip. Null only when the month has no content at all.
 */
export function pickWeeklyItem(index: number, content: MonthContent, opts: { doneIds: Set<string>; ackIds: Set<string> }): WeeklyItem | null {
  const round = Math.floor(index / 3);
  const m = content.month;
  const tip = (): WeeklyItem | null => {
    const tips = content.playTips;
    if (tips.length === 0) return null;
    const t = tips[round % tips.length];
    return { kind: "tip", id: t.id, title: t.title, url: `/play-tips/${m}/` };
  };
  switch (index % 3) {
    case 1: {
      const open = content.watchOuts.filter((w) => !opts.ackIds.has(w.id));
      if (open.length === 0) return tip();
      const w = open[round % open.length];
      return { kind: "watchout", id: w.id, title: w.title, action: w.action, url: `/watch-outs/${m}/` };
    }
    case 2: {
      const open = content.milestones.filter((x) => !opts.doneIds.has(x.id));
      if (open.length === 0) return tip();
      return { kind: "milestones", id: `ms-${m}-${round}`, titles: open.slice(0, MAX_MILESTONE_TITLES).map((x) => x.title), url: `/milestones/${m}/` };
    }
    default:
      return tip();
  }
}
