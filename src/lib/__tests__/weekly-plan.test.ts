import { describe, expect, it } from "vitest";
import { nextSundays, pickWeeklyItem, WEEKLY_HOUR } from "../weekly-plan";
import type { MonthContent } from "../month-content";

const content: MonthContent = {
  month: 17,
  milestones: [
    { id: "m-17-1", month: 17, category: "social", title: "Points to show", description: "" },
    { id: "m-17-2", month: 17, category: "language", title: "Says three words", description: "" },
    { id: "m-17-3", month: 17, category: "physical", title: "Walks alone", description: "" },
    { id: "m-17-4", month: 17, category: "cognitive", title: "Scribbles", description: "" },
  ],
  playTips: [
    { id: "pt-17-1", month: 17, title: "Ball roll", description: "", difficulty: "easy", category: "physical" },
    { id: "pt-17-2", month: 17, title: "Name the animals", description: "", difficulty: "easy", category: "language" },
  ],
  watchOuts: [
    { id: "wo-17-1", month: 17, title: "Stair gates", description: "", severity: "urgent", action: "Gate both ends." },
    { id: "wo-17-2", month: 17, title: "Small parts", description: "", severity: "caution" },
  ],
  note: null,
};
const none = { doneIds: new Set<string>(), ackIds: new Set<string>() };

describe("nextSundays", () => {
  it("starts with the first Sunday morning strictly after `from`", () => {
    const [first] = nextSundays(new Date(2026, 8, 2, 10, 0), 1); // Wed 2 Sep 2026
    expect([first.getFullYear(), first.getMonth(), first.getDate(), first.getDay(), first.getHours()]).toEqual([2026, 8, 6, 0, WEEKLY_HOUR]);
  });
  it("uses today when it is Sunday and the hour has not passed", () => {
    const [first] = nextSundays(new Date(2026, 8, 6, 8, 0), 1);
    expect(first.getDate()).toBe(6);
  });
  it("skips to next week when Sunday morning has already passed", () => {
    const [first] = nextSundays(new Date(2026, 8, 6, 10, 0), 1);
    expect(first.getDate()).toBe(13);
  });
  it("returns consecutive weeks", () => {
    const dates = nextSundays(new Date(2026, 8, 2, 10, 0), 4);
    expect(dates.map((x) => x.getDate())).toEqual([6, 13, 20, 27]);
    expect(dates.every((x) => x.getDay() === 0 && x.getHours() === WEEKLY_HOUR)).toBe(true);
  });
});

describe("pickWeeklyItem", () => {
  it("rotates play tip, watch-out, open milestones", () => {
    expect(pickWeeklyItem(0, content, none)).toMatchObject({ kind: "tip", id: "pt-17-1", url: "/play-tips/17/" });
    expect(pickWeeklyItem(1, content, none)).toMatchObject({ kind: "watchout", id: "wo-17-1", url: "/watch-outs/17/" });
    expect(pickWeeklyItem(2, content, none)).toMatchObject({ kind: "milestones", url: "/milestones/17/" });
  });
  it("advances through tips and watch-outs on later rounds", () => {
    expect(pickWeeklyItem(3, content, none)?.id).toBe("pt-17-2");
    expect(pickWeeklyItem(4, content, none)?.id).toBe("wo-17-2");
    expect(pickWeeklyItem(6, content, none)?.id).toBe("pt-17-1");
  });
  it("skips acknowledged watch-outs", () => {
    const r = pickWeeklyItem(1, content, { ...none, ackIds: new Set(["wo-17-1"]) });
    expect(r?.id).toBe("wo-17-2");
  });
  it("lists at most three open milestones and omits confirmed ones", () => {
    const r = pickWeeklyItem(2, content, { ...none, doneIds: new Set(["m-17-1"]) });
    expect(r).toMatchObject({ kind: "milestones", titles: ["Says three words", "Walks alone", "Scribbles"] });
  });
  it("falls back to a play tip when every milestone is confirmed", () => {
    const r = pickWeeklyItem(2, content, { ...none, doneIds: new Set(content.milestones.map((m) => m.id)) });
    expect(r?.kind).toBe("tip");
  });
  it("falls back to a tip when every watch-out is acknowledged", () => {
    const r = pickWeeklyItem(1, content, { ...none, ackIds: new Set(["wo-17-1", "wo-17-2"]) });
    expect(r?.kind).toBe("tip");
  });
  it("returns null for an empty month", () => {
    expect(pickWeeklyItem(0, { ...content, milestones: [], playTips: [], watchOuts: [] }, none)).toBeNull();
  });
});
