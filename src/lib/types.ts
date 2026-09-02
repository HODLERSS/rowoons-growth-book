export interface SourceInfo {
  source?: string;
  sourceUrl?: string;
  /** Our short summary of what the cited page says (not a verbatim quotation). */
  sourceSummary?: string;
}

export type MilestoneCategory = "social" | "language" | "cognitive" | "physical";

export interface Milestone extends SourceInfo {
  id: string;
  month: number;
  category: MilestoneCategory;
  title: string;
  description: string;
}

export interface MilestoneCompletion {
  [milestoneId: string]: {
    completed: boolean;
    completedAt?: string;
  };
}

export type Difficulty = "easy" | "medium" | "advanced";

export interface PlayTip extends SourceInfo {
  id: string;
  month: number;
  title: string;
  description: string;
  materials?: string[];
  difficulty: Difficulty;
  category: string;
}

export type Severity = "info" | "caution" | "urgent";

export interface WatchOut extends SourceInfo {
  id: string;
  month: number;
  title: string;
  description: string;
  severity: Severity;
  action?: string;
}

export interface MonthlyNote {
  milestone: string;
  watchout: string;
  cheerup: string;
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
  nameKo?: string;
  birthDate: string;
  /** Optional; when 3+ weeks after the birthday, content follows the corrected age until 24 months. */
  dueDate?: string;
  /** Kept for backward compatibility; not shown in the UI. */
  gender?: "boy" | "girl";
}

export interface AgeInfo {
  months: number;
  days: number;
  totalDays: number;
  isFuture: boolean;
  valid: boolean;
}

export interface Settings {
  reminders: boolean;
  notifyDismissed: boolean;
}

export interface BackupFile {
  app: "sprout" | "dodam";
  version: 1;
  exportedAt: string;
  profile: BabyInfo | null;
  language: "en" | "ko" | null;
  milestones: MilestoneCompletion;
  memos: Memo[];
}
