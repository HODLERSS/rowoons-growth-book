"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface MilestoneProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

export function MilestoneProgress({ completed, total, percentage }: MilestoneProgressProps) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {completed} of {total} completed
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
