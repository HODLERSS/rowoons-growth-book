"use client";

import { Milestone } from "@/lib/types";
import { MilestoneCard } from "./milestone-card";
import { useLanguage } from "@/contexts/language-context";

interface MilestoneListProps {
  milestones: Milestone[];
  isCompleted: (id: string) => boolean;
  onToggle: (id: string) => void;
}

export function MilestoneList({ milestones, isCompleted, onToggle }: MilestoneListProps) {
  const { t } = useLanguage();

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("milestones.no_section")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {milestones.map((milestone) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          completed={isCompleted(milestone.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
