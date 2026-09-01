import { describe, expect, it } from "vitest";
import { addMonths, calculateAge, getCurrentMonth, isBeyondRange, monthForAge, parseLocalDate, toLocalISO, upcomingMonthiversaries } from "../age-calculator";

const d = (s: string) => parseLocalDate(s)!;

describe("parseLocalDate", () => {
  it("parses valid dates as local midnight", () => {
    const x = d("2025-04-17");
    expect([x.getFullYear(), x.getMonth(), x.getDate(), x.getHours()]).toEqual([2025, 3, 17, 0]);
  });
  it("rejects malformed and impossible dates", () => {
    expect(parseLocalDate("2025-02-30")).toBeNull();
    expect(parseLocalDate("2025-13-01")).toBeNull();
    expect(parseLocalDate("17/04/2025")).toBeNull();
    expect(parseLocalDate("")).toBeNull();
  });
  it("round-trips through toLocalISO", () => {
    expect(toLocalISO(d("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("addMonths", () => {
  it("clamps to the end of shorter months", () => {
    expect(toLocalISO(addMonths(d("2025-01-31"), 1))).toBe("2025-02-28");
    expect(toLocalISO(addMonths(d("2024-01-31"), 1))).toBe("2024-02-29");
    expect(toLocalISO(addMonths(d("2025-03-31"), 1))).toBe("2025-04-30");
  });
  it("crosses years", () => {
    expect(toLocalISO(addMonths(d("2025-11-15"), 3))).toBe("2026-02-15");
  });
});

describe("calculateAge", () => {
  it("counts months the way parents do (Rowoon: born 2025-04-17)", () => {
    const a = calculateAge("2025-04-17", d("2026-08-31"));
    expect(a).toMatchObject({ months: 16, days: 14, isFuture: false, valid: true });
    expect(a.totalDays).toBe(501);
  });
  it("is 0 months on the birthday and 1 month on the first monthiversary", () => {
    expect(calculateAge("2025-04-17", d("2025-04-17"))).toMatchObject({ months: 0, days: 0 });
    expect(calculateAge("2025-04-17", d("2025-05-16"))).toMatchObject({ months: 0, days: 29 });
    expect(calculateAge("2025-04-17", d("2025-05-17"))).toMatchObject({ months: 1, days: 0 });
  });
  it("handles month-end birthdays", () => {
    expect(calculateAge("2025-01-31", d("2025-02-28"))).toMatchObject({ months: 1, days: 0 });
    expect(calculateAge("2025-01-31", d("2025-03-01"))).toMatchObject({ months: 1, days: 1 });
    expect(calculateAge("2025-01-31", d("2025-03-31"))).toMatchObject({ months: 2, days: 0 });
  });
  it("handles leap-day birthdays", () => {
    expect(calculateAge("2024-02-29", d("2025-02-28"))).toMatchObject({ months: 12, days: 0 });
    expect(calculateAge("2024-02-29", d("2025-03-01"))).toMatchObject({ months: 12, days: 1 });
  });
  it("flags future birthdays and invalid input", () => {
    expect(calculateAge("2030-01-01", d("2026-08-31"))).toMatchObject({ months: 0, days: 0, isFuture: true, valid: true });
    expect(calculateAge("nonsense", d("2026-08-31"))).toMatchObject({ valid: false });
  });
  it("ignores the time of day", () => {
    const evening = new Date(2026, 7, 31, 23, 59);
    expect(calculateAge("2025-04-17", evening)).toMatchObject({ months: 16, days: 14 });
  });
});

describe("month mapping", () => {
  it("maps age to the book's month, clamped to 1–36", () => {
    expect(getCurrentMonth("2025-04-17", d("2026-08-31"))).toBe(16);
    expect(getCurrentMonth("2026-08-20", d("2026-08-31"))).toBe(1);
    expect(getCurrentMonth("2020-01-01", d("2026-08-31"))).toBe(36);
    expect(monthForAge({ months: 0, days: 5, totalDays: 5, isFuture: false, valid: true })).toBe(1);
  });
  it("detects beyond-range ages", () => {
    expect(isBeyondRange(calculateAge("2020-01-01", d("2026-08-31")))).toBe(true);
    expect(isBeyondRange(calculateAge("2025-04-17", d("2026-08-31")))).toBe(false);
    expect(isBeyondRange(calculateAge("2030-01-01", d("2026-08-31")))).toBe(false);
  });
});

describe("upcomingMonthiversaries", () => {
  it("lists only future monthiversaries up to month 36", () => {
    const list = upcomingMonthiversaries("2025-04-17", d("2026-08-31"));
    expect(list[0]).toMatchObject({ month: 17 });
    expect(toLocalISO(list[0].date)).toBe("2026-09-17");
    expect(list[list.length - 1].month).toBe(36);
    expect(list.length).toBe(20);
  });
  it("returns nothing for invalid dates", () => {
    expect(upcomingMonthiversaries("bad", d("2026-08-31"))).toEqual([]);
  });
});
