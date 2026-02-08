"use client";

import { Milestone, MilestoneCategory } from "@/lib/types";
import { MILESTONE_CATEGORIES } from "@/lib/constants";
import { MilestoneList } from "./milestone-list";
import { useLanguage } from "@/contexts/language-context";

interface CategorySectionProps {
  category: MilestoneCategory;
  milestones: Milestone[];
  isCompleted: (id: string) => boolean;
  onToggle: (id: string) => void;
}

export function CategorySection({
  category,
  milestones,
  isCompleted,
  onToggle,
}: CategorySectionProps) {
  const { t } = useLanguage();
  const config = MILESTONE_CATEGORIES.find((c) => c.value === category);
  if (!config || milestones.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span>{config.emoji}</span>
        <span>{t(`category.${category}`)}</span>
        <span className="text-xs font-normal text-muted-foreground">
          ({milestones.length})
        </span>
      </h2>
      <MilestoneList
        milestones={milestones}
        isCompleted={isCompleted}
        onToggle={onToggle}
      />
    </section>
  );
}
