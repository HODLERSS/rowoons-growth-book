import { MilestoneCategory } from "./types";

export const MONTH_RANGE = {
  min: 1,
  max: 36,
};

export const CDC_MONTHS = [9, 12, 15, 18, 24, 30, 36] as const;

export const ALL_MONTHS = Array.from(
  { length: MONTH_RANGE.max - MONTH_RANGE.min + 1 },
  (_, i) => i + MONTH_RANGE.min
);

export const MILESTONE_CATEGORIES: {
  value: MilestoneCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { value: "social", label: "Social & Emotional", emoji: "\uD83D\uDC95", color: "bg-pink-100 text-pink-800" },
  { value: "language", label: "Language & Communication", emoji: "\uD83D\uDDE3\uFE0F", color: "bg-blue-100 text-blue-800" },
  { value: "cognitive", label: "Cognitive", emoji: "\uD83E\uDDE0", color: "bg-purple-100 text-purple-800" },
  { value: "physical", label: "Movement & Physical", emoji: "\uD83C\uDFC3", color: "bg-green-100 text-green-800" },
];

export const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  advanced: { label: "Advanced", color: "bg-orange-100 text-orange-700" },
};

export const SEVERITY_CONFIG = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700", icon: "\u2139\uFE0F" },
  caution: { label: "Caution", color: "bg-yellow-100 text-yellow-700", icon: "\u26A0\uFE0F" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700", icon: "\uD83D\uDEA8" },
};

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "Home" },
  { href: "/milestones/current", label: "Milestones", icon: "Star" },
  { href: "/play-tips/current", label: "Play Tips", icon: "Sparkles" },
  { href: "/watch-outs/current", label: "Watch-Outs", icon: "AlertTriangle" },
  { href: "/memo", label: "Memo", icon: "BookOpen" },
];
