"use client";

import { Milestone, MilestoneCategory } from "@/lib/types";
import { MILESTONE_CATEGORIES } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/shared/source-modal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

interface MilestoneCardProps {
  milestone: Milestone;
  completed: boolean;
  onToggle: (id: string) => void;
}

function getCategoryConfig(category: MilestoneCategory) {
  return MILESTONE_CATEGORIES.find((c) => c.value === category)!;
}

export function MilestoneCard({ milestone, completed, onToggle }: MilestoneCardProps) {
  const { t } = useLanguage();
  const category = getCategoryConfig(milestone.category);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-all",
        completed
          ? "bg-muted/50 border-muted"
          : "bg-card border-border hover:border-primary/20 hover:shadow-sm"
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={() => onToggle(milestone.id)}
        className="mt-0.5"
        aria-label={
          completed
            ? t("milestones.mark_incomplete").replace("{title}", milestone.title)
            : t("milestones.mark_complete").replace("{title}", milestone.title)
        }
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium leading-tight",
              completed && "line-through opacity-60"
            )}
          >
            {milestone.title}
          </span>
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0 hidden sm:inline-flex", category.color)}
          >
            {category.emoji} {t(`category.${milestone.category}`)}
          </Badge>
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground leading-relaxed",
            completed && "opacity-50"
          )}
        >
          {milestone.description}
        </p>
        {milestone.source && (
          <div className={cn(completed && "opacity-50")}>
            <SourceBadge sourceInfo={milestone} itemTitle={milestone.title} />
          </div>
        )}
      </div>
    </div>
  );
}
