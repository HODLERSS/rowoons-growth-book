"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

interface MilestoneProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

export function MilestoneProgress({ completed, total, percentage }: MilestoneProgressProps) {
  const { t } = useLanguage();

  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t("milestones.completed")
              .replace("{completed}", completed.toString())
              .replace("{total}", total.toString())}
          </span>
          <span className="text-sm font-semibold text-primary">
            {percentage}%
          </span>
        </div>
        <Progress value={percentage} className="h-2.5" />
      </CardContent>
    </Card>
  );
}
