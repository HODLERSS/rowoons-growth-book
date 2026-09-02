import { describe, expect, it } from "vitest";
import { correctedAge, isPreterm, CORRECTED_AGE_UNTIL_MONTHS, PRETERM_MIN_EARLY_DAYS } from "../corrected-age";
import { parseLocalDate } from "../age-calculator";

const d = (s: string) => parseLocalDate(s)!;

describe("isPreterm", () => {
  it("is false without a due date", () => {
    expect(isPreterm("2025-04-17", undefined)).toBe(false);
    expect(isPreterm("2025-04-17", null)).toBe(false);
    expect(isPreterm("2025-04-17", "")).toBe(false);
  });
  it("is false when born on time or late", () => {
    expect(isPreterm("2025-04-17", "2025-04-17")).toBe(false);
    expect(isPreterm("2025-04-17", "2025-04-10")).toBe(false);
  });
  it("needs at least three weeks early (before 37 weeks)", () => {
    expect(PRETERM_MIN_EARLY_DAYS).toBe(21);
    expect(isPreterm("2025-04-17", "2025-05-07")).toBe(false); // 20 days early
    expect(isPreterm("2025-04-17", "2025-05-08")).toBe(true); // 21 days early
  });
  it("ignores malformed dates", () => {
    expect(isPreterm("2025-04-17", "2025-13-40")).toBe(false);
  });
});

describe("correctedAge", () => {
  it("returns the chronological age for a term baby", () => {
    const r = correctedAge("2025-01-01", undefined, d("2025-09-01"));
    expect(r.corrected).toBe(false);
    expect(r.age.months).toBe(8);
    expect(r.chronological.months).toBe(8);
  });
  it("counts from the due date for a preterm baby", () => {
    // born 2 months early
    const r = correctedAge("2025-01-01", "2025-03-01", d("2025-09-01"));
    expect(r.corrected).toBe(true);
    expect(r.chronological.months).toBe(8);
    expect(r.age.months).toBe(6);
    expect(r.age.days).toBe(0);
  });
  it("stops correcting at 24 months chronological", () => {
    expect(CORRECTED_AGE_UNTIL_MONTHS).toBe(24);
    const before = correctedAge("2025-01-01", "2025-03-01", d("2026-12-31"));
    expect(before.corrected).toBe(true);
    expect(before.chronological.months).toBe(23);
    const at = correctedAge("2025-01-01", "2025-03-01", d("2027-01-01"));
    expect(at.corrected).toBe(false);
    expect(at.age.months).toBe(24);
  });
  it("reports zero corrected age before the due date has passed", () => {
    const r = correctedAge("2025-01-01", "2025-03-01", d("2025-02-01"));
    expect(r.corrected).toBe(true);
    expect(r.age).toMatchObject({ months: 0, days: 0, isFuture: false, valid: true });
    expect(r.chronological.months).toBe(1);
  });
  it("never corrects when the birth date itself is in the future", () => {
    const r = correctedAge("2027-01-01", "2027-03-01", d("2026-09-01"));
    expect(r.corrected).toBe(false);
    expect(r.age.isFuture).toBe(true);
  });
});
