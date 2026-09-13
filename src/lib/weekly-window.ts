/** Time helpers for the weekly push job (server). Pure, so they can be unit-tested and reused by the admin "run now". */
export const WEEKLY_LOCAL_HOUR = 9;
export const WEEKLY_LOCAL_DAY = 0; // Sunday
const EPOCH_SUNDAY = Date.UTC(2026, 0, 4); // 2026-01-04, a Sunday

export function localParts(at: Date, tz: string): { weekday: number; hour: number; date: string } {
  let zone = tz;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { weekday, hour, date: `${get("year")}-${get("month")}-${get("day")}` };
}

export function isWeeklySlot(at: Date, tz: string): boolean {
  const p = localParts(at, tz);
  return p.weekday === WEEKLY_LOCAL_DAY && p.hour === WEEKLY_LOCAL_HOUR;
}

/** Not more than once per six days: an hourly job can fire twice in the 09:00 hour without a double send. */
export function dueForWeekly(lastAt: string | null, now: Date): boolean {
  if (!lastAt) return true;
  return now.getTime() - Date.parse(lastAt) > 6 * 86_400_000;
}

export function weekIndex(at: Date): number {
  return Math.floor((at.getTime() - EPOCH_SUNDAY) / (7 * 86_400_000));
}
