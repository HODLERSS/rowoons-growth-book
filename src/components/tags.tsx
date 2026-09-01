"use client";

import { TriangleAlert, CircleAlert, Info, Users, MessageCircle, Lightbulb, PersonStanding, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty, MilestoneCategory, Severity } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";

export const CATEGORY_ICON: Record<MilestoneCategory, LucideIcon> = {
  social: Users,
  language: MessageCircle,
  cognitive: Lightbulb,
  physical: PersonStanding,
};

const SEVERITY: Record<Severity, { icon: LucideIcon; cls: string }> = {
  urgent: { icon: TriangleAlert, cls: "text-danger" },
  caution: { icon: CircleAlert, cls: "text-caution" },
  info: { icon: Info, cls: "text-info" },
};

export function SeverityTag({ severity }: { severity: Severity }) {
  const { t } = useLanguage();
  const { icon: Icon, cls } = SEVERITY[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em]", cls)}>
      <Icon className="size-4" strokeWidth={2.2} aria-hidden="true" />
      {t(`severity.${severity}`)}
    </span>
  );
}

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-hover px-2 text-[12px] font-semibold text-muted-foreground">
      {t(`difficulty.${difficulty}`)}
    </span>
  );
}

export function CategoryLabel({ category, className }: { category: MilestoneCategory; className?: string }) {
  const { t } = useLanguage();
  const Icon = CATEGORY_ICON[category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground", className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(`category.${category}`)}
    </span>
  );
}
