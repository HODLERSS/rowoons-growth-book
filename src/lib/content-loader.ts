import { Milestone, PlayTip, WatchOut } from "./types";
import milestonesData from "@/content/milestones.json";
import playTipsData from "@/content/play-tips.json";
import watchOutsData from "@/content/watch-outs.json";

export function getMilestones(month: number): Milestone[] {
  return (milestonesData as Milestone[]).filter((m) => m.month === month);
}

export function getMilestonesByCategory(month: number) {
  const milestones = getMilestones(month);
  return {
    social: milestones.filter((m) => m.category === "social"),
    language: milestones.filter((m) => m.category === "language"),
    cognitive: milestones.filter((m) => m.category === "cognitive"),
    physical: milestones.filter((m) => m.category === "physical"),
  };
}

export function getAllMilestones(): Milestone[] {
  return milestonesData as Milestone[];
}

export function getPlayTips(month: number): PlayTip[] {
  return (playTipsData as PlayTip[]).filter((t) => t.month === month);
}

export function getWatchOuts(month: number): WatchOut[] {
  return (watchOutsData as WatchOut[]).filter((w) => w.month === month);
}

export function getAvailableMonths(
  type: "milestones" | "play-tips" | "watch-outs"
): number[] {
  const data =
    type === "milestones"
      ? milestonesData
      : type === "play-tips"
        ? playTipsData
        : watchOutsData;
  const months = new Set((data as { month: number }[]).map((d) => d.month));
  return Array.from(months).sort((a, b) => a - b);
}
