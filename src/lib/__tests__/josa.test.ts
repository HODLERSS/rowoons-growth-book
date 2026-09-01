import { describe, expect, it } from "vitest";
import { hasBatchim, josa } from "../josa";

describe("hasBatchim", () => {
  it("reads Hangul finals", () => {
    expect(hasBatchim("로운")).toBe(true);
    expect(hasBatchim("하나")).toBe(false);
    expect(hasBatchim("도담")).toBe(true);
  });
  it("reads digits by their Korean reading", () => {
    expect(hasBatchim("1")).toBe(true);
    expect(hasBatchim("2")).toBe(false);
    expect(hasBatchim("10")).toBe(true);
  });
  it("guesses Latin names", () => {
    expect(hasBatchim("Rowoon")).toBe(true);
    expect(hasBatchim("Emma")).toBe(false);
    expect(hasBatchim("Noah")).toBe(false);
    expect(hasBatchim("Daniel")).toBe(true);
  });
  it("returns null for unknown scripts", () => {
    expect(hasBatchim("日向")).toBeNull();
    expect(hasBatchim("")).toBeNull();
  });
});

describe("josa", () => {
  it("picks 이/가", () => {
    expect(josa("로운", "이/가")).toBe("로운이");
    expect(josa("하나", "이/가")).toBe("하나가");
  });
  it("picks 을/를 and 은/는", () => {
    expect(josa("책", "을/를")).toBe("책을");
    expect(josa("기록", "은/는")).toBe("기록은");
    expect(josa("메모", "을/를")).toBe("메모를");
  });
  it("handles 으로/로 including ㄹ finals", () => {
    expect(josa("집", "으로/로")).toBe("집으로");
    expect(josa("서울", "으로/로")).toBe("서울로");
    expect(josa("학교", "으로/로")).toBe("학교로");
  });
  it("falls back to both forms for unknown scripts", () => {
    expect(josa("日向", "이/가")).toBe("日向이(가)");
  });
});
