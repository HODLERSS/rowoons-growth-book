import { BabyInfo, MilestoneCategory } from "./types";

export const BABY: BabyInfo = {
  name: "Rowoon",
  nameKo: "로운",
  birthDate: "2025-04-17",
  gender: "girl",
};

export const MONTH_RANGE = {
  min: 9,
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
  { value: "social", label: "Social & Emotional", emoji: "💕", color: "bg-pink-100 text-pink-800" },
  { value: "language", label: "Language & Communication", emoji: "🗣️", color: "bg-blue-100 text-blue-800" },
  { value: "cognitive", label: "Cognitive", emoji: "🧠", color: "bg-purple-100 text-purple-800" },
  { value: "physical", label: "Movement & Physical", emoji: "🏃", color: "bg-green-100 text-green-800" },
];

export const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  advanced: { label: "Advanced", color: "bg-orange-100 text-orange-700" },
};

export const SEVERITY_CONFIG = {
  info: { label: "Info", color: "bg-blue-100 text-blue-700", icon: "ℹ️" },
  caution: { label: "Caution", color: "bg-yellow-100 text-yellow-700", icon: "⚠️" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700", icon: "🚨" },
};

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "Home" },
  { href: "/milestones/current", label: "Milestones", icon: "Star" },
  { href: "/play-tips/current", label: "Play Tips", icon: "Sparkles" },
  { href: "/watch-outs/current", label: "Watch-Outs", icon: "AlertTriangle" },
  { href: "/memo", label: "Memo", icon: "BookOpen" },
];
