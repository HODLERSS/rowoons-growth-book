export interface SourceInfo {
  source?: string;
  sourceUrl?: string;
  sourceQuote?: string;
}

export interface Milestone extends SourceInfo {
  id: string;
  month: number;
  category: MilestoneCategory;
  title: string;
  description: string;
}

export type MilestoneCategory = "social" | "language" | "cognitive" | "physical";

export interface MilestoneCompletion {
  [milestoneId: string]: {
    completed: boolean;
    completedAt?: string;
  };
}

export interface PlayTip extends SourceInfo {
  id: string;
  month: number;
  title: string;
  description: string;
  materials?: string[];
  difficulty: "easy" | "medium" | "advanced";
  category: string;
}

export interface WatchOut extends SourceInfo {
  id: string;
  month: number;
  title: string;
  description: string;
  severity: "info" | "caution" | "urgent";
  action?: string;
}

export interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  month?: number;
}

export interface BabyInfo {
  name: string;
  birthDate: string;
  gender: "boy" | "girl";
}

export interface AgeInfo {
  months: number;
  days: number;
  totalDays: number;
  label: string;
}
