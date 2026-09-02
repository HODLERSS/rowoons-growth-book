import { describe, expect, it } from "vitest";
import { getMilestones, getMilestonesByCategory, getMonthlyNote, getPlayTips, getWatchOuts } from "../content-loader";
import { ALL_MONTHS } from "../constants";
import milestonesEn from "@/content/milestones.json";
import milestonesKo from "@/content/ko/milestones.json";

describe("content coverage", () => {
  it("has milestones in all four categories, tips, watch-outs and a note for every month, in both languages", () => {
    for (const lang of ["en", "ko"] as const) {
      for (const m of ALL_MONTHS) {
        const byCat = getMilestonesByCategory(m, lang);
        expect(getMilestones(m, lang).length, `${lang} month ${m} milestones`).toBeGreaterThanOrEqual(6);
        for (const cat of ["social", "language", "cognitive", "physical"] as const) {
          expect(byCat[cat].length, `${lang} month ${m} ${cat}`).toBeGreaterThanOrEqual(1);
        }
        expect(getPlayTips(m, lang).length, `${lang} month ${m} tips`).toBeGreaterThanOrEqual(3);
        expect(getWatchOuts(m, lang).length, `${lang} month ${m} watch-outs`).toBeGreaterThanOrEqual(2);
        const note = getMonthlyNote(m, lang);
        expect(note?.milestone && note.watchout && note.cheerup, `${lang} note ${m}`).toBeTruthy();
      }
    }
  });
  it("uses identical ids in both languages", () => {
    const en = milestonesEn.map((m) => m.id).sort();
    const ko = milestonesKo.map((m) => m.id).sort();
    expect(ko).toEqual(en);
  });
  it("sorts watch-outs urgent → caution → info", () => {
    const order = { urgent: 0, caution: 1, info: 2 };
    for (const m of ALL_MONTHS) {
      const sev = getWatchOuts(m, "en").map((w) => order[w.severity]);
      expect(sev).toEqual(sev.slice().sort((a, b) => a - b));
    }
  });
  it("every item cites a source", () => {
    for (const m of ALL_MONTHS) {
      for (const item of [...getMilestones(m, "en"), ...getPlayTips(m, "en"), ...getWatchOuts(m, "en")]) {
        expect(item.source, item.id).toBeTruthy();
        expect(item.sourceUrl, item.id).toMatch(/^https:\/\//);
        expect(item.sourceSummary, item.id).toBeTruthy();
      }
    }
  });
});
