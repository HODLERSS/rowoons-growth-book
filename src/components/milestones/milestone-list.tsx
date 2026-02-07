"use client";

import { Milestone } from "@/lib/types";
import { MilestoneCard } from "./milestone-card";

interface MilestoneListProps {
  milestones: Milestone[];
  isCompleted: (id: string) => boolean;
  onToggle: (id: string) => void;
}

export function MilestoneList({ milestones, isCompleted, onToggle }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No milestones in this section.
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
