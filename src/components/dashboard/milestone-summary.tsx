"use client";

import { useAge } from "@/hooks/use-age";
import { useMilestones } from "@/hooks/use-milestones";
import { getMilestones } from "@/lib/content-loader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MILESTONE_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

export function MilestoneSummary() {
  const { currentMonth } = useAge();
  const { stats } = useMilestones();

  const milestones = getMilestones(currentMonth);
  const milestoneIds = milestones.map((m) => m.id);
  const { completed, total, percentage } = stats(milestoneIds);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Milestone Progress</span>
          <Link
            href={`/milestones/${currentMonth}`}
            className="text-sm font-normal text-primary hover:underline"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {completed} of {total} milestones completed
            </span>
            <span className="font-medium text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {total === 0 && (
          <p className="text-sm text-muted-foreground">
            No milestones available for month {currentMonth} yet.
          </p>
        )}

        {total > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {MILESTONE_CATEGORIES.map((cat) => {
              const catMilestones = milestones.filter(
                (m) => m.category === cat.value
              );
              const catIds = catMilestones.map((m) => m.id);
              const catStats = stats(catIds);
              return (
                <div
                  key={cat.value}
                  className="flex items-center gap-2 text-xs rounded-lg p-2 bg-muted/50"
                >
                  <span>{cat.emoji}</span>
                  <span className="truncate text-muted-foreground">
                    {cat.label}
                  </span>
                  <span className="ml-auto font-medium">
                    {catStats.completed}/{catStats.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
