import { AgeInfo } from "./types";
import { MONTH_RANGE } from "./constants";

export function calculateAge(birthDate: string, fromDate?: string): AgeInfo {
  const [y, m, d] = birthDate.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  const now = fromDate ? new Date(fromDate) : new Date();

  const totalDays = Math.floor(
    (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
  );

  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();

  const dayOfBirth = birth.getDate();
  const currentDay = now.getDate();

  if (currentDay < dayOfBirth) {
    months -= 1;
  }

  const days = currentDay >= dayOfBirth
    ? currentDay - dayOfBirth
    : new Date(now.getFullYear(), now.getMonth(), 0).getDate() - dayOfBirth + currentDay;

  const label =
    months === 1
      ? `1 month${days > 0 ? ` and ${days} day${days !== 1 ? "s" : ""}` : ""}`
      : `${months} months${days > 0 ? ` and ${days} day${days !== 1 ? "s" : ""}` : ""}`;

  return { months, days, totalDays, label };
}

export function getCurrentMonth(birthDate: string): number {
  const { months } = calculateAge(birthDate);
  return Math.max(MONTH_RANGE.min, Math.min(MONTH_RANGE.max, months));
}

export function getClosestCDCMonth(month: number): number {
  const cdcMonths = [9, 12, 15, 18, 24, 30, 36];
  return cdcMonths.reduce((prev, curr) =>
    Math.abs(curr - month) < Math.abs(prev - month) ? curr : prev
  );
}
