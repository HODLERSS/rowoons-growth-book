import type { Difficulty, MilestoneCategory, Severity } from "./types";

export const APP_VERSION = "1.0.0";
export const APP_URL = "https://baby.minjae.co";
export const SUPPORT_EMAIL = "minjae.m.lee@gmail.com";

export const MONTH_RANGE = { min: 1, max: 36 } as const;

export const ALL_MONTHS = Array.from({ length: MONTH_RANGE.max - MONTH_RANGE.min + 1 }, (_, i) => i + MONTH_RANGE.min);

export const CATEGORY_ORDER: MilestoneCategory[] = ["social", "language", "cognitive", "physical"];

export const SEVERITY_ORDER: Record<Severity, number> = { urgent: 0, caution: 1, info: 2 };

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "advanced"];

export const NAV = [
  { key: "home", href: "/" },
  { key: "milestones", href: "/milestones" },
  { key: "play", href: "/play-tips" },
  { key: "safety", href: "/watch-outs" },
  { key: "journal", href: "/memo" },
] as const;

export const SOURCES = [
  { name: "CDC – Learn the Signs. Act Early.", url: "https://www.cdc.gov/act-early/milestones/" },
  { name: "AAP – HealthyChildren.org", url: "https://www.healthychildren.org/" },
  { name: "WHO – Child growth standards", url: "https://www.who.int/tools/child-growth-standards" },
  { name: "Zero to Three", url: "https://www.zerotothree.org/" },
  { name: "NAEYC", url: "https://www.naeyc.org/" },
  { name: "CPSC – Kids and Babies", url: "https://www.cpsc.gov/Safety-Education/Safety-Guides/Kids-and-Babies" },
  { name: "Pathways.org", url: "https://pathways.org/" },
] as const;
