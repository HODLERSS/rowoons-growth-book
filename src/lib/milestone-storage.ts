import { MilestoneCompletion } from "./types";

const STORAGE_KEY = "rowoon-milestones";

function getStorageData(): MilestoneCompletion {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setStorageData(data: MilestoneCompletion) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getMilestoneCompletion(): MilestoneCompletion {
  return getStorageData();
}

export function isMilestoneCompleted(milestoneId: string): boolean {
  const data = getStorageData();
  return data[milestoneId]?.completed ?? false;
}

export function toggleMilestoneCompletion(milestoneId: string): boolean {
  const data = getStorageData();
  const isCurrentlyCompleted = data[milestoneId]?.completed ?? false;

  if (isCurrentlyCompleted) {
    delete data[milestoneId];
  } else {
    data[milestoneId] = {
      completed: true,
      completedAt: new Date().toISOString(),
    };
  }

  setStorageData(data);
  return !isCurrentlyCompleted;
}

export function getCompletionStats(milestoneIds: string[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const data = getStorageData();
  const completed = milestoneIds.filter(
    (id) => data[id]?.completed
  ).length;
  return {
    completed,
    total: milestoneIds.length,
    percentage: milestoneIds.length > 0 ? Math.round((completed / milestoneIds.length) * 100) : 0,
  };
}
