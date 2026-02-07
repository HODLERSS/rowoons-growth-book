"use client";

import Link from "next/link";
import { useAge } from "@/hooks/use-age";
import { useMilestones } from "@/hooks/use-milestones";
import { getMilestones } from "@/lib/content-loader";
import { MILESTONE_CATEGORIES } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function UpcomingMilestones() {
  const { currentMonth } = useAge();
  const { isCompleted } = useMilestones();

  const milestones = getMilestones(currentMonth);
  const upcoming = milestones
    .filter((m) => !isCompleted(m.id))
    .slice(0, 5);

  if (upcoming.length === 0 && milestones.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              All milestones for month {currentMonth} are completed!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No milestones available for month {currentMonth} yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Upcoming Milestones</span>
          <Link
            href={`/milestones/${currentMonth}`}
            className="text-sm font-normal text-primary hover:underline"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((milestone) => {
          const category = MILESTONE_CATEGORIES.find(
            (c) => c.value === milestone.category
          );
          return (
            <div
              key={milestone.id}
              className="flex items-start gap-3 rounded-lg p-2.5 bg-muted/50"
            >
              <span className="text-base mt-0.5">{category?.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{milestone.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {milestone.description}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] shrink-0 ${category?.color}`}
              >
                {category?.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
