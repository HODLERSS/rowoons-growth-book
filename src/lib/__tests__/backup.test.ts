import { describe, expect, it } from "vitest";
import { backupFilename, isBabyInfo, isBackupFile, isCompletion, isMemoArray } from "../backup";
import { jsonOr } from "../store";

describe("validators", () => {
  it("accepts a well-formed backup and rejects others", () => {
    const good = { app: "dodam", version: 1, exportedAt: "2026-08-31T00:00:00Z", profile: { name: "Rowoon", birthDate: "2025-04-17" }, language: "ko", milestones: {}, memos: [] };
    expect(isBackupFile(good)).toBe(true);
    expect(isBackupFile({ ...good, app: "other" })).toBe(false);
    expect(isBackupFile({ ...good, memos: "nope" })).toBe(false);
    expect(isBackupFile({ ...good, profile: { name: 1 } })).toBe(false);
    expect(isBackupFile(null)).toBe(false);
  });
  it("type guards", () => {
    expect(isBabyInfo({ name: "a", birthDate: "2025-01-01" })).toBe(true);
    expect(isBabyInfo({ name: "a" })).toBe(false);
    expect(isMemoArray([{ id: "x" }])).toBe(true);
    expect(isMemoArray([{}])).toBe(false);
    expect(isCompletion({})).toBe(true);
    expect(isCompletion([])).toBe(false);
  });
  it("names backups by date", () => {
    expect(backupFilename(new Date(2026, 7, 31))).toBe("dodam-backup-20260831.json");
  });
});

describe("jsonOr", () => {
  it("falls back on missing, corrupt or invalid data", () => {
    const parse = jsonOr<number[]>([], (v): v is number[] => Array.isArray(v));
    expect(parse(null)).toEqual([]);
    expect(parse("{not json")).toEqual([]);
    expect(parse('{"a":1}')).toEqual([]);
    expect(parse("[1,2]")).toEqual([1, 2]);
  });
});
