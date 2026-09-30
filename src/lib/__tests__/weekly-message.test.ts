import { describe, expect, it } from "vitest";
import { weeklyMessage } from "../weekly-message";

const base = { lang: "en", tz: "America/Chicago", name: "Rowoon", birth_date: "2025-04-17", due_date: null };

describe("weeklyMessage", () => {
  it("names the baby and the book month in the profile's language", () => {
    const now = new Date("2026-09-30T15:00:00Z");
    const en = weeklyMessage(base, now)!;
    expect(en.title).toBe("Rowoon, month 17");
    expect(en.month).toBe(17);
    expect(en.url).toMatch(/^\/(play-tips|watch-outs|milestones)\/17\/$/);
    expect(weeklyMessage({ ...base, lang: "ko", name: "로운" }, now)!.title).toBe("로운, 17개월");
  });
  it("uses the local date of the profile's time zone and a default name", () => {
    // 2026-09-17 02:00 UTC is still the 16th in Chicago: 16 months, not 17
    expect(weeklyMessage({ ...base, name: null }, new Date("2026-09-17T02:00:00Z"))!.title).toBe("your baby, month 16");
  });
  it("is null without a birth date", () => {
    expect(weeklyMessage({ ...base, birth_date: null }, new Date())).toBeNull();
  });
});
