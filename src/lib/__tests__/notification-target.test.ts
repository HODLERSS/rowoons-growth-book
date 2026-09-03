import { describe, expect, it } from "vitest";
import { notificationTarget } from "../notification-target";

describe("notificationTarget", () => {
  it("returns the in-app path carried by a reminder", () => {
    expect(notificationTarget({ url: "/milestones/17/" })).toBe("/milestones/17/");
    expect(notificationTarget({ url: "/play-tips/16/" })).toBe("/play-tips/16/");
  });
  it("falls back to Home for anything that is not an in-app path", () => {
    expect(notificationTarget(undefined)).toBe("/");
    expect(notificationTarget({})).toBe("/");
    expect(notificationTarget({ url: "https://evil.example/x" })).toBe("/");
    expect(notificationTarget({ url: "//evil.example/x" })).toBe("/");
    expect(notificationTarget({ url: "javascript:alert(1)" })).toBe("/");
    expect(notificationTarget({ url: 42 })).toBe("/");
  });
  it("only accepts the routes the app has", () => {
    expect(notificationTarget({ url: "/admin/" })).toBe("/");
    expect(notificationTarget({ url: "/milestones/99/" })).toBe("/");
    expect(notificationTarget({ url: "/watch-outs/3/" })).toBe("/watch-outs/3/");
    expect(notificationTarget({ url: "/memo/" })).toBe("/memo/");
  });
});
