import { describe, expect, it } from "vitest";
import { mergeKey, SYNC_KEYS } from "../sync-merge";

const t0 = "2026-09-01T00:00:00.000Z";
const t1 = "2026-09-02T00:00:00.000Z";

describe("mergeKey", () => {
  it("lists exactly the keys that sync", () => {
    expect(SYNC_KEYS).toEqual(["profile", "milestones", "memos", "settings", "acks", "language"]);
  });

  it("milestones: union of confirmations, keeping the earlier confirmation date", () => {
    const local = { a: { completed: true, completedAt: t1 }, b: { completed: true, completedAt: t0 } };
    const remote = { a: { completed: true, completedAt: t0 }, c: { completed: true, completedAt: t1 } };
    expect(mergeKey("milestones", local, remote)).toEqual({ a: { completed: true, completedAt: t0 }, b: { completed: true, completedAt: t0 }, c: { completed: true, completedAt: t1 } });
  });

  it("memos: union by id, newer updatedAt wins, sorted by updatedAt desc", () => {
    const local = [{ id: "1", title: "L", content: "", createdAt: t0, updatedAt: t1 }, { id: "2", title: "only local", content: "", createdAt: t0, updatedAt: t0 }];
    const remote = [{ id: "1", title: "R", content: "", createdAt: t0, updatedAt: t0 }, { id: "3", title: "only remote", content: "", createdAt: t1, updatedAt: t1 }];
    const merged = mergeKey("memos", local, remote) as { id: string; title: string }[];
    expect(merged.map((m) => m.id)).toEqual(["1", "3", "2"]);
    expect(merged[0].title).toBe("L");
  });

  it("acks: union without duplicates", () => {
    expect(mergeKey("acks", ["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("profile and settings: remote wins when present, local otherwise", () => {
    expect(mergeKey("profile", { name: "L", birthDate: "2025-04-17" }, { name: "R", birthDate: "2025-04-17" })).toEqual({ name: "R", birthDate: "2025-04-17" });
    expect(mergeKey("profile", { name: "L", birthDate: "2025-04-17" }, null)).toEqual({ name: "L", birthDate: "2025-04-17" });
    expect(mergeKey("settings", { reminders: true }, { reminders: false })).toEqual({ reminders: false });
  });

  it("language: the device preference wins (local), falling back to remote", () => {
    expect(mergeKey("language", "ko", "en")).toBe("ko");
    expect(mergeKey("language", null, "en")).toBe("en");
  });

  it("tolerates garbage on either side", () => {
    expect(mergeKey("milestones", "nope", null)).toEqual({});
    expect(mergeKey("memos", null, 42)).toEqual([]);
    expect(mergeKey("acks", 1, "x")).toEqual([]);
  });
});
