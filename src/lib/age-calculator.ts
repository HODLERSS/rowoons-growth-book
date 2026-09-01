import { MONTH_RANGE } from "./constants";
import type { AgeInfo } from "./types";

/** Parse "YYYY-MM-DD" as a local-time date at midnight. Returns null when malformed or impossible. */
export function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function toLocalISO(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Add calendar months, clamping the day to the target month's length (Jan 31 + 1 → Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/**
 * Age in whole calendar months plus remaining days, computed the way parents count:
 * a baby born on the 17th turns "1 month" on the next 17th (or the last day of a shorter month).
 */
export function calculateAge(birthDate: string, from: Date | number = Date.now()): AgeInfo {
  const birth = parseLocalDate(birthDate);
  const now = startOfDay(typeof from === "number" ? new Date(from) : from);
  if (!birth) return { months: 0, days: 0, totalDays: 0, isFuture: false, valid: false };
  const totalDays = diffDays(birth, now);
  if (totalDays < 0) return { months: 0, days: 0, totalDays, isFuture: true, valid: true };

  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  let anchor = addMonths(birth, months);
  if (anchor.getTime() > now.getTime()) {
    months -= 1;
    anchor = addMonths(birth, months);
  }
  const days = diffDays(anchor, now);
  return { months, days, totalDays, isFuture: false, valid: true };
}

/** Content month for an age: month 1 covers the first month of life; clamped to the book's range. */
export function monthForAge(age: AgeInfo): number {
  return Math.max(MONTH_RANGE.min, Math.min(MONTH_RANGE.max, age.months));
}

export function getCurrentMonth(birthDate: string, from: Date | number = Date.now()): number {
  return monthForAge(calculateAge(birthDate, from));
}

/** True when the child is older than the book covers. */
export function isBeyondRange(age: AgeInfo): boolean {
  return age.valid && !age.isFuture && age.months > MONTH_RANGE.max;
}

/** The next dates on which the child turns N months old (for reminders), N in (currentMonths, maxMonth]. */
export function upcomingMonthiversaries(birthDate: string, from: Date | number = Date.now(), maxMonth = MONTH_RANGE.max) {
  const birth = parseLocalDate(birthDate);
  if (!birth) return [] as { month: number; date: Date }[];
  const now = startOfDay(typeof from === "number" ? new Date(from) : from);
  const out: { month: number; date: Date }[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    const date = addMonths(birth, m);
    if (date.getTime() > now.getTime()) out.push({ month: m, date });
  }
  return out;
}
