import { Home, Flag, Shapes, Shield, BookOpen, type LucideIcon } from "lucide-react";
import type { MessageKey } from "@/i18n";

export interface NavItem {
  key: "home" | "milestones" | "play" | "safety" | "journal";
  label: MessageKey;
  base: string;
  icon: LucideIcon;
  monthly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "nav.home", base: "/", icon: Home, monthly: false },
  { key: "milestones", label: "nav.milestones", base: "/milestones", icon: Flag, monthly: true },
  { key: "play", label: "nav.play", base: "/play-tips", icon: Shapes, monthly: true },
  { key: "safety", label: "nav.safety", base: "/watch-outs", icon: Shield, monthly: true },
  { key: "journal", label: "nav.journal", base: "/memo", icon: BookOpen, monthly: false },
];

export function navHref(item: NavItem, currentMonth: number): string {
  return item.monthly ? `${item.base}/${currentMonth}` : item.base;
}

export function navActive(item: NavItem, pathname: string): boolean {
  if (item.base === "/") return pathname === "/";
  return pathname === item.base || pathname.startsWith(item.base + "/");
}
