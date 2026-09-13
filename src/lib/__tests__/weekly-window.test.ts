import { describe, expect, it } from "vitest";
import { localParts, isWeeklySlot, dueForWeekly, weekIndex } from "../weekly-window";

describe("localParts", () => {
  it("resolves the wall-clock in a timezone", () => {
    // 2026-09-13T00:30Z is Sunday 09:30 in Seoul and Saturday 19:30 in Chicago.
    const at = new Date("2026-09-13T00:30:00Z");
    expect(localParts(at, "Asia/Seoul")).toMatchObject({ weekday: 0, hour: 9, date: "2026-09-13" });
    expect(localParts(at, "America/Chicago")).toMatchObject({ weekday: 6, hour: 19, date: "2026-09-12" });
  });
  it("falls back to UTC for an unknown zone", () => {
    expect(localParts(new Date("2026-09-13T09:05:00Z"), "Mars/Olympus")).toMatchObject({ weekday: 0, hour: 9 });
  });
});

describe("isWeeklySlot", () => {
  it("is Sunday 09:xx local time only", () => {
    expect(isWeeklySlot(new Date("2026-09-13T00:30:00Z"), "Asia/Seoul")).toBe(true); // Sun 09:30 KST
    expect(isWeeklySlot(new Date("2026-09-13T01:30:00Z"), "Asia/Seoul")).toBe(false); // Sun 10:30 KST
    expect(isWeeklySlot(new Date("2026-09-13T14:10:00Z"), "America/Chicago")).toBe(true); // Sun 09:10 CDT
    expect(isWeeklySlot(new Date("2026-09-12T14:10:00Z"), "America/Chicago")).toBe(false); // Sat
  });
});

describe("dueForWeekly", () => {
  const now = new Date("2026-09-13T14:10:00Z");
  it("is due when never sent or sent more than 6 days ago", () => {
    expect(dueForWeekly(null, now)).toBe(true);
    expect(dueForWeekly("2026-09-06T14:00:00Z", now)).toBe(true);
  });
  it("is not due when sent within the last 6 days (guards double sends in the same hour)", () => {
    expect(dueForWeekly("2026-09-13T14:02:00Z", now)).toBe(false);
    expect(dueForWeekly("2026-09-10T00:00:00Z", now)).toBe(false);
  });
});

describe("weekIndex", () => {
  it("counts whole weeks since the epoch Sunday so every phone rotates in step", () => {
    expect(weekIndex(new Date("2026-01-04T12:00:00Z"))).toBe(0);
    expect(weekIndex(new Date("2026-01-11T12:00:00Z"))).toBe(1);
    expect(weekIndex(new Date("2026-09-13T12:00:00Z"))).toBe(36);
  });
});
