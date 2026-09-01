import { describe, expect, it } from "vitest";
import { en, ko, type MessageKey } from "@/i18n/messages";
import { detectLanguage, formatDate, translate } from "@/i18n";

describe("message tables", () => {
  const enKeys = Object.keys(en) as MessageKey[];
  it("Korean defines every English key and nothing else", () => {
    expect(Object.keys(ko).sort()).toEqual(enKeys.slice().sort());
  });
  it("every Korean UI string contains Hangul (except brand/language names)", () => {
    const exempt = new Set<MessageKey>(["app.name", "language.en", "language.ko"]);
    for (const k of enKeys) {
      if (exempt.has(k)) continue;
      expect(ko[k], k).toMatch(/[가-힣]/);
    }
  });
  it("uses the same {tokens} in both languages", () => {
    for (const k of enKeys) {
      const tok = (s: string) => Array.from(s.matchAll(/\{(\w+)/g), (m) => m[1]).sort();
      expect(tok(ko[k]), k).toEqual(tok(en[k]));
    }
  });
  it("Korean UI uses 해요체 only", () => {
    for (const k of enKeys) {
      expect(ko[k], k).not.toMatch(/(습니다|입니다|십시오)/);
    }
  });
  it("uses typographic ellipses and no three dots", () => {
    for (const k of enKeys) {
      expect(en[k], k).not.toContain("...");
      expect(ko[k], k).not.toContain("...");
    }
  });
});

describe("translate", () => {
  it("substitutes tokens", () => {
    expect(translate("en", "home.confirmed", { done: 2, total: 7 })).toBe("2 of 7 confirmed");
    expect(translate("ko", "home.confirmed", { done: 2, total: 7 })).toBe("7개 중 2개 확인");
  });
  it("appends Korean particles from {token|pair}", () => {
    expect(translate("ko", "reminder.title", { name: "로운", month: 5 })).toBe("오늘 로운이 5개월이 됐어요");
    expect(translate("ko", "reminder.title", { name: "하나", month: 5 })).toBe("오늘 하나가 5개월이 됐어요");
    expect(translate("ko", "journal.delete_body", { title: "첫 미소" })).toBe("‘첫 미소’가 삭제돼요. 되돌릴 수 없어요.");
  });
  it("ignores particle specs in English", () => {
    expect(translate("en", "reminder.title", { name: "Rowoon", month: 5 })).toBe("Rowoon is 5 months old today");
  });
  it("leaves unknown tokens visible rather than crashing", () => {
    expect(translate("en", "home.confirmed", { done: 1 })).toBe("1 of {total} confirmed");
  });
  it("quotes with the language's marks", () => {
    expect(translate("en", "journal.delete_body", { title: "First smile" })).toBe("“First smile” will be removed. This can’t be undone.");
  });
});

describe("detectLanguage", () => {
  it("prefers Korean when any preferred language is Korean before English", () => {
    expect(detectLanguage(["ko-KR", "en-US"])).toBe("ko");
    expect(detectLanguage(["en-US", "ko-KR"])).toBe("en");
    expect(detectLanguage(["fr-FR"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });
});

describe("formatDate", () => {
  it("formats per locale", () => {
    const date = new Date(2025, 3, 17);
    expect(formatDate("en", date)).toBe("April 17, 2025");
    expect(formatDate("ko", date)).toBe("2025년 4월 17일");
  });
});
