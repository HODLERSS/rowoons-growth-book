import { describe, expect, it, vi } from "vitest";
import { acceptReminders, shouldAskReminders, DISMISS_PATCH, type AskStatus } from "../reminder-ask";
import type { Settings } from "../types";

const off: Settings = { reminders: false, notifyDismissed: false };
const base = { native: true, hasBaby: true, nextMonth: 17, settings: off, status: "prompt" as AskStatus | null };

describe("shouldAskReminders", () => {
  it("asks a native user with a baby, reminders off, and iOS still able to say yes", () => {
    expect(shouldAskReminders(base)).toBe(true);
    expect(shouldAskReminders({ ...base, status: "granted" })).toBe(true);
  });
  it("never shows on the web (the web push card stays as is)", () => {
    expect(shouldAskReminders({ ...base, native: false })).toBe(false);
  });
  it("needs a baby and a month still ahead in the book", () => {
    expect(shouldAskReminders({ ...base, hasBaby: false })).toBe(false);
    expect(shouldAskReminders({ ...base, nextMonth: null })).toBe(false);
  });
  it("stays hidden once reminders are on or the card was answered", () => {
    expect(shouldAskReminders({ ...base, settings: { ...off, reminders: true } })).toBe(false);
    expect(shouldAskReminders({ ...base, status: "granted", settings: { ...off, reminders: true } })).toBe(false);
    expect(shouldAskReminders({ ...base, settings: { ...off, ...DISMISS_PATCH } })).toBe(false);
  });
  it("does not use the web card's dismissal (a different question)", () => {
    expect(shouldAskReminders({ ...base, settings: { ...off, notifyDismissed: true } })).toBe(true);
  });
  it("waits for the permission status and never nags after iOS refused", () => {
    expect(shouldAskReminders({ ...base, status: null })).toBe(false);
    expect(shouldAskReminders({ ...base, status: "denied" })).toBe(false);
    expect(shouldAskReminders({ ...base, status: "unsupported" })).toBe(false);
  });
});

describe("acceptReminders", () => {
  it("turns reminders on when anything was scheduled", async () => {
    const status = vi.fn(async (): Promise<AskStatus> => "granted");
    const res = await acceptReminders({ schedule: async () => 20, status });
    expect(res).toEqual({ outcome: "on", patch: { reminders: true, remindersAsked: true } });
    expect(status).not.toHaveBeenCalled();
    expect(shouldAskReminders({ ...base, settings: { ...off, ...res.patch } })).toBe(false);
  });
  it("keeps reminders off and reports the refusal when iOS says no", async () => {
    const res = await acceptReminders({ schedule: async () => 0, status: async () => "denied" });
    expect(res).toEqual({ outcome: "denied", patch: { reminders: false, remindersAsked: true } });
    expect(shouldAskReminders({ ...base, settings: { ...off, ...res.patch } })).toBe(false);
  });
  it("keeps reminders off without the refusal note when nothing could be scheduled for another reason", async () => {
    const res = await acceptReminders({ schedule: async () => 0, status: async () => "granted" });
    expect(res).toEqual({ outcome: "off", patch: { reminders: false, remindersAsked: true } });
  });
});
