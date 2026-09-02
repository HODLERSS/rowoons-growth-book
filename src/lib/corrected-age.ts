import { calculateAge, parseLocalDate } from "./age-calculator";
import type { AgeInfo } from "./types";

/** Born at least this many days before the due date = before 37 weeks = preterm (AAP definition). */
export const PRETERM_MIN_EARLY_DAYS = 21;
/** AAP: use corrected age for development until 24 months chronological. */
export const CORRECTED_AGE_UNTIL_MONTHS = 24;

const DAY = 86_400_000;

export function isPreterm(birthDate: string, dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const birth = parseLocalDate(birthDate);
  const due = parseLocalDate(dueDate);
  if (!birth || !due) return false;
  return Math.round((due.getTime() - birth.getTime()) / DAY) >= PRETERM_MIN_EARLY_DAYS;
}

export interface CorrectedAge {
  /** The age the app should use for content: corrected while it applies, chronological otherwise. */
  age: AgeInfo;
  chronological: AgeInfo;
  corrected: boolean;
}

/**
 * Age for content selection. Preterm babies count from their due date until 24 months chronological,
 * so milestones are compared against the age they would be if born on time.
 */
export function correctedAge(birthDate: string, dueDate: string | null | undefined, from: Date | number = Date.now()): CorrectedAge {
  const chronological = calculateAge(birthDate, from);
  const applies = chronological.valid && !chronological.isFuture && chronological.months < CORRECTED_AGE_UNTIL_MONTHS && isPreterm(birthDate, dueDate);
  if (!applies) return { age: chronological, chronological, corrected: false };
  const fromDue = calculateAge(dueDate!, from);
  const age: AgeInfo = fromDue.isFuture ? { months: 0, days: 0, totalDays: 0, isFuture: false, valid: true } : fromDue;
  return { age, chronological, corrected: true };
}
